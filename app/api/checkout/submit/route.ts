import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";
import { createOrderStory } from "@/lib/storyblok-management";
import {
  removePaymentIntentCleanup,
} from "@/lib/checkout-reservation";

export const runtime = "nodejs"; // good for Stripe webhook reliability

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // IMPORTANT: use raw text for signature verification
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    // --------------------------
    // ✅ CHECKOUT COMPLETED
    // --------------------------
    const eventType = event.type as string;

    if (eventType === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Idempotency: don't process same session twice
      const already = await redis.get(`processed:session:${session.id}`);
      if (already) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const metadata = session.metadata ?? {};

      // ✅ FIX: these MUST be inside the event handler, where session exists
      const deliveryMethod: "courier" | "inpost" =
  metadata.deliveryMethod === "inpost" ? "inpost" : "courier";
      const inpostPoint = metadata.inpostPoint
        ? safeParseJson(metadata.inpostPoint, null)
        : null;

      // Optional metadata you might be storing from /start:
      const productSlugs = safeParseJson<string[]>(
        metadata.productSlugs,
        metadata.productSlug ? [metadata.productSlug] : []
      );
      const quantities = safeParseJson<Record<string, number>>(
        metadata.quantities,
        {}
      );

      // Mark processed first (or very early) to avoid double-processing
      await redis.set(`processed:session:${session.id}`, "1", {
        ex: 60 * 60 * 24 * 30, // 30 days
      });

      // Move reserved holds into stock on successful payment
      const reserveKey = `reserve:session:${session.id}`;
      const reserveRaw = await redis.get(reserveKey);
      let reservedInStockBySlug: Record<string, number> = {};

      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          session.metadata?.reservedInStock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`stock:product:${slug}`, -reserved);
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);

      // Create Storyblok order (wrap in try so webhook doesn't fail hard)
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
        // Keep 200 OK so Stripe doesn't retry forever due to Storyblok issues
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ PAYMENT INTENT SUCCEEDED
    // --------------------------
    if (eventType === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.info("Payment intent succeeded:", intent.id);

      const reserveKey = `reserve:payment_intent:${intent.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};
      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          intent.metadata?.reserved_in_stock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`stock:product:${slug}`, -reserved);
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);
      await removePaymentIntentCleanup(intent.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ PAYMENT INTENT FAILED
    // --------------------------
    if (eventType === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn("Payment intent failed:", intent.id);

      const reserveKey = `reserve:payment_intent:${intent.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};
      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          intent.metadata?.reserved_in_stock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);
      await removePaymentIntentCleanup(intent.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ PAYMENT INTENT SUCCEEDED
    // --------------------------
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.info("Payment intent succeeded:", intent.id);

      const reserveKey = `reserve:payment_intent:${intent.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};
      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          intent.metadata?.reserved_in_stock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`stock:product:${slug}`, -reserved);
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);
      await removePaymentIntentCleanup(intent.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ PAYMENT INTENT FAILED
    // --------------------------
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn("Payment intent failed:", intent.id);

      const reserveKey = `reserve:payment_intent:${intent.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};
      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          intent.metadata?.reserved_in_stock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);
      await removePaymentIntentCleanup(intent.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ PAYMENT INTENT SUCCEEDED
    // --------------------------
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.info("Payment intent succeeded:", intent.id);

      const reserveKey = `reserve:payment_intent:${intent.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};
      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          intent.metadata?.reserved_in_stock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`stock:product:${slug}`, -reserved);
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);
      await removePaymentIntentCleanup(intent.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ PAYMENT INTENT FAILED
    // --------------------------
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn("Payment intent failed:", intent.id);

      const reserveKey = `reserve:payment_intent:${intent.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};
      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          intent.metadata?.reserved_in_stock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);
      await removePaymentIntentCleanup(intent.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ CHECKOUT EXPIRED
    // --------------------------
    if (eventType === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Restore reserved holds
      // Prefer what you stored in Redis at /start, because it's the source of truth
      const reserveKey = `reserve:session:${session.id}`;
      const reserveRaw = await redis.get(reserveKey);

      let reservedInStockBySlug: Record<string, number> = {};

      if (reserveRaw) {
        const parsed = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reserveRaw,
          {}
        );
        reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
      } else {
        // Fallback to metadata if Redis record missing
        reservedInStockBySlug = safeParseJson<Record<string, number>>(
          session.metadata?.reservedInStock,
          {}
        );
      }

      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`reserve:product:${slug}`, -reserved);
        }
      }

      await redis.del(reserveKey);

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Ignore other events (still return 200)
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 to avoid Stripe retry storms for non-critical failures
    return NextResponse.json({ received: true }, { status: 200 });
  }
}







