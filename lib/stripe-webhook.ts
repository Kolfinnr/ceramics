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
  return typeof newStock === "number" ? newStock : null;
}

type WebhookResult = {
  status: number;
  body: Record<string, unknown>;
};

const okResult = (body: Record<string, unknown> = { received: true }): WebhookResult => ({
  status: 200,
  body,
});

const errorResult = (status: number, message: string): WebhookResult => ({
  status,
  body: { error: message },
});

async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  eventId: string
): Promise<WebhookResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    console.info("Checkout session not paid yet.", { eventId, sessionId: session.id });
    return okResult();
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
  });

  return okResult();
}

async function handlePaymentIntentSucceeded(
  event: Stripe.Event,
  eventId: string
): Promise<WebhookResult> {
  const intent = event.data.object as Stripe.PaymentIntent;
  const reserveKey = `reserve:payment_intent:${intent.id}`;
  const { reservedInStockBySlug } = await loadReservation(
    reserveKey,
    intent.metadata?.reserved_in_stock
  );

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

  console.info("Payment intent succeeded.", { eventId, intentId: intent.id, updatedStocks });
  return okResult();
}

async function handlePaymentIntentFailed(
  event: Stripe.Event,
  eventId: string
): Promise<WebhookResult> {
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
  return okResult();
}

async function handleCheckoutSessionExpired(
  event: Stripe.Event,
  eventId: string
): Promise<WebhookResult> {
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
  return okResult();
}

export async function handleStripeWebhookPayload(
  rawBody: string,
  signature: string | null
): Promise<WebhookResult> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return errorResult(500, "Missing STRIPE_WEBHOOK_SECRET");
  }

  if (!signature) {
    return errorResult(400, "Missing stripe-signature header");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature verification failed:", message);
    return errorResult(400, "Invalid signature");
  }

  const eventId = event.id;
  const eventType = event.type;
  const processedKey = `processed:event:${eventId}`;
  const alreadyProcessed = await redis.get(processedKey);
  if (alreadyProcessed) {
    console.info("Stripe webhook already processed.", { eventId, eventType });
    return okResult();
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
        return okResult();
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", { eventId, eventType, error });
    return errorResult(500, "Webhook handler error");
  }
}

export async function handleStripeWebhook(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const result = await handleStripeWebhookPayload(rawBody, signature);
  return Response.json(result.body, { status: result.status });
}
