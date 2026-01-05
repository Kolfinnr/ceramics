import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";
import { createOrderStory } from "@/lib/storyblok-management";

export const runtime = "nodejs"; // required for Stripe signature verification reliability

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Invalid signature:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // --------------------------
    // ✅ PAYMENT COMPLETED
    // --------------------------
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // ✅ Idempotency: Stripe may retry webhooks
      const processedKey = `processed:session:${session.id}`;
      const firstTime = await redis.set(processedKey, "1", { nx: true, ex: 60 * 60 * 24 });
      if (!firstTime) return NextResponse.json({ received: true }, { status: 200 });

      const productSlugs = safeParseJson<string[]>(
        session.metadata?.productSlugs ?? null,
        session.metadata?.productSlug ? [session.metadata.productSlug] : []
      );

      const quantities = safeParseJson<Record<string, number>>(
        session.metadata?.quantities ?? null,
        {}
      );

      const reservedInStock = safeParseJson<Record<string, number>>(
        session.metadata?.reservedInStock ?? null,
        {}
      );

      const backorder = safeParseJson<Record<string, number>>(
        session.metadata?.backorder ?? null,
        {}
      );

      // IMPORTANT: In the new model, stock was already decremented ("reserved") in /checkout/start.
      // On successful payment we DO NOT restore anything — we only clear reservation record.
      await redis.del(`reserve:session:${session.id}`);

      // Keep this cleanup in case some old locks still exist
      for (const slug of productSlugs) {
        await redis.del(`lock:product:${slug}`);
      }

      // Create order story in Storyblok (include quantities/backorder so you can fulfill properly)
      const customerDetails = session.customer_details ?? null;
      const address = customerDetails?.address ?? null;

      try {
        await createOrderStory({
          orderId: session.id,
          productSlugs,
          status: "paid",
          // Optional extra info for fulfillment:
          quantities,
          reservedInStock,
          backorder,
          customer: {
            name: customerDetails?.name ?? "Unknown",
            email: customerDetails?.email ?? "Unknown",
            phone: customerDetails?.phone ?? "Unknown",
            address1: address?.line1 ?? "Unknown",
            postalCode: address?.postal_code ?? "Unknown",
            city: address?.city ?? "Unknown",
            country: address?.country ?? "Unknown",
          },
        });
      } catch (error) {
        console.error("Failed to create Storyblok order:", error);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // --------------------------
    // ✅ CHECKOUT EXPIRED / FAILED
    // --------------------------
    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      // Restore reserved in-stock units
      const reservationRaw = await redis.get<string>(`reserve:session:${session.id}`);
      if (reservationRaw) {
        const reservation = safeParseJson<{ reservedInStockBySlug?: Record<string, number> }>(
          reservationRaw,
          {}
        );

        const reservedMap = reservation.reservedInStockBySlug ?? {};
        for (const [slug, reserved] of Object.entries(reservedMap)) {
          const n = Number(reserved ?? 0);
          if (n > 0) {
            await redis.incrby(`stock:product:${slug}`, n);
          }
        }

        await redis.del(`reserve:session:${session.id}`);
      }

      // Cleanup any legacy locks if present
      const productSlugs = safeParseJson<string[]>(
        session.metadata?.productSlugs ?? null,
        session.metadata?.productSlug ? [session.metadata.productSlug] : []
      );
      for (const slug of productSlugs) {
        await redis.del(`lock:product:${slug}`);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Ignore other event types safely
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}





