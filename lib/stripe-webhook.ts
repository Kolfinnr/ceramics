import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";
import { removePaymentIntentCleanup } from "@/lib/checkout-reservation";
import { createOrderStory, updateProductStock } from "@/lib/storyblok-management";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PROCESSED_EVENT_TTL_SECONDS = 60 * 60 * 24 * 30;
const STOCK_DECREMENT_LUA = `
local stockKey = KEYS[1]
local reserveKey = KEYS[2]
local amount = tonumber(ARGV[1])

local stock = tonumber(redis.call("GET", stockKey) or "0")
if stock <= 0 then
  redis.call("INCRBY", reserveKey, -amount)
  return -1
end
local newStock = stock - amount
if newStock < 0 then
  newStock = 0
end
redis.call("SET", stockKey, newStock)
redis.call("INCRBY", reserveKey, -amount)
return newStock
`;

type ParsedReservation = {
  reservedInStockBySlug: Record<string, number>;
};

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseReservedFromPayload(payload: unknown): ParsedReservation {
  if (payload && typeof payload === "object" && "reservedInStockBySlug" in payload) {
    const reserved = (payload as { reservedInStockBySlug?: unknown }).reservedInStockBySlug;
    if (reserved && typeof reserved === "object" && !Array.isArray(reserved)) {
      return { reservedInStockBySlug: reserved as Record<string, number> };
    }
    return { reservedInStockBySlug: {} };
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return { reservedInStockBySlug: payload as Record<string, number> };
  }

  return { reservedInStockBySlug: {} };
}

async function loadReservation(reserveKey: string, fallbackValue: unknown) {
  const reserveRaw = await redis.get<string>(reserveKey);
  if (typeof reserveRaw === "string" && reserveRaw.length > 0) {
    const parsed = safeParseJson<unknown>(reserveRaw, {});
    return parseReservedFromPayload(parsed);
  }

  const fallbackParsed = safeParseJson<unknown>(fallbackValue, {});
  return parseReservedFromPayload(fallbackParsed);
}

async function decrementStockAndReserve(slug: string, reserved: number) {
  if (reserved <= 0) return null;
  const stockKey = `stock:product:${slug}`;
  const reserveKey = `reserve:product:${slug}`;
  const result = await redis.eval<number[]>(
    STOCK_DECREMENT_LUA,
    [stockKey, reserveKey],
    [reserved]
  );
  const newStock = Array.isArray(result) ? result[0] : result;
  if (typeof newStock !== "number" || newStock < 0) return null;
  return newStock;
}

async function handleCheckoutSessionCompleted(event: Stripe.Event, eventId: string) {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    console.info("Checkout session not paid yet.", { eventId, sessionId: session.id });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const metadata = session.metadata ?? {};
  const reserveKey = `reserve:session:${session.id}`;
  const { reservedInStockBySlug } = await loadReservation(
    reserveKey,
    session.metadata?.reservedInStock
  );

  const deliveryMethod: "courier" | "inpost" =
    metadata.deliveryMethod === "inpost" ? "inpost" : "courier";
  const inpostPoint = metadata.inpostPoint ? safeParseJson(metadata.inpostPoint, null) : null;
  const productSlugs = safeParseJson<string[]>(
    metadata.productSlugs,
    metadata.productSlug ? [metadata.productSlug] : []
  );
  const quantities = safeParseJson<Record<string, number>>(metadata.quantities, {});
  const backorderBySlug = safeParseJson<Record<string, number>>(metadata.backorder, {});

  const updatedStocks: Record<string, number> = {};

  for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
    const newStock = await decrementStockAndReserve(slug, reserved);
    if (typeof newStock === "number") {
      updatedStocks[slug] = newStock;
      await updateProductStock({ slug, stock: newStock });
    }
  }

  await redis.del(reserveKey);

  try {
    const customer = session.customer_details;
    await createOrderStory({
      orderId: session.id,
      status: "paid",
      productSlugs,
      quantities,
      backorder: backorderBySlug,
      customer: {
        name: customer?.name ?? "Unknown",
        email: customer?.email ?? "Unknown",
        phone: customer?.phone ?? "Unknown",
        address1: customer?.address?.line1 ?? "Unknown",
        postalCode: customer?.address?.postal_code ?? "Unknown",
        city: customer?.address?.city ?? "Unknown",
        country: customer?.address?.country ?? "Unknown",
      },
      delivery: {
        method: deliveryMethod,
        inpostPoint,
      },
    });
  } catch (error) {
    console.error("Failed to create Storyblok order:", error);
  }

  await redis.set(`processed:event:${eventId}`, "1", {
    ex: PROCESSED_EVENT_TTL_SECONDS,
  });

  console.info("Checkout session completed.", {
    eventId,
    sessionId: session.id,
    updatedStocks,
    backorderBySlug,
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handlePaymentIntentSucceeded(event: Stripe.Event, eventId: string) {
  const intent = event.data.object as Stripe.PaymentIntent;
  const reserveKey = `reserve:payment_intent:${intent.id}`;
  const { reservedInStockBySlug } = await loadReservation(
    reserveKey,
    intent.metadata?.reserved_in_stock
  );
  const quantities = safeParseJson<Record<string, number>>(intent.metadata?.quantities, {});
  const backorderBySlug = safeParseJson<Record<string, number>>(intent.metadata?.backorder, {});

  const updatedStocks: Record<string, number> = {};

  for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
    const newStock = await decrementStockAndReserve(slug, reserved);
    if (typeof newStock === "number") {
      updatedStocks[slug] = newStock;
      await updateProductStock({ slug, stock: newStock });
    }
  }

  await redis.del(reserveKey);
  await removePaymentIntentCleanup(intent.id);
  await redis.set(`processed:event:${eventId}`, "1", {
    ex: PROCESSED_EVENT_TTL_SECONDS,
  });

  console.info("Payment intent succeeded.", {
    eventId,
    intentId: intent.id,
    updatedStocks,
    quantities,
    backorderBySlug,
  });
  return NextResponse.json({ received: true }, { status: 200 });
}

async function handlePaymentIntentFailed(event: Stripe.Event, eventId: string) {
  const intent = event.data.object as Stripe.PaymentIntent;
  const reserveKey = `reserve:payment_intent:${intent.id}`;
  const { reservedInStockBySlug } = await loadReservation(
    reserveKey,
    intent.metadata?.reserved_in_stock
  );

  for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
    if (reserved > 0) {
      await redis.incrby(`reserve:product:${slug}`, -reserved);
    }
  }

  await redis.del(reserveKey);
  await removePaymentIntentCleanup(intent.id);
  await redis.set(`processed:event:${eventId}`, "1", {
    ex: PROCESSED_EVENT_TTL_SECONDS,
  });

  console.warn("Payment intent failed.", { eventId, intentId: intent.id });
  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutSessionExpired(event: Stripe.Event, eventId: string) {
  const session = event.data.object as Stripe.Checkout.Session;
  const reserveKey = `reserve:session:${session.id}`;
  const { reservedInStockBySlug } = await loadReservation(
    reserveKey,
    session.metadata?.reservedInStock
  );

  for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
    if (reserved > 0) {
      await redis.incrby(`reserve:product:${slug}`, -reserved);
    }
  }

  await redis.del(reserveKey);
  await redis.set(`processed:event:${eventId}`, "1", {
    ex: PROCESSED_EVENT_TTL_SECONDS,
  });

  console.info("Checkout session expired.", { eventId, sessionId: session.id });
  return NextResponse.json({ received: true }, { status: 200 });
}

export async function handleStripeWebhook(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventId = event.id;
  const eventType = event.type;
  const processedKey = `processed:event:${eventId}`;
  const alreadyProcessed = await redis.get(processedKey);
  if (alreadyProcessed) {
    console.info("Stripe webhook already processed.", { eventId, eventType });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    switch (eventType) {
      case "checkout.session.completed":
        return await handleCheckoutSessionCompleted(event, eventId);
      case "checkout.session.expired":
        return await handleCheckoutSessionExpired(event, eventId);
      case "payment_intent.succeeded":
        return await handlePaymentIntentSucceeded(event, eventId);
      case "payment_intent.payment_failed":
        return await handlePaymentIntentFailed(event, eventId);
      default:
        console.info("Stripe webhook ignored.", { eventId, eventType });
        return NextResponse.json({ received: true }, { status: 200 });
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", { eventId, eventType, error });
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
