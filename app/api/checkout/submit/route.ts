import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";
import { createOrderStory } from "@/lib/storyblok-management";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const productSlugsRaw =
        session.metadata?.productSlugs ?? JSON.stringify([session.metadata?.productSlug]);
      const productSlugs = Array.isArray(productSlugsRaw)
        ? productSlugsRaw
        : (() => {
            try {
              return JSON.parse(productSlugsRaw ?? "[]") as string[];
            } catch {
              return session.metadata?.productSlug ? [session.metadata.productSlug] : [];
            }
          })();

      if (productSlugs.length > 0) {
        for (const slug of productSlugs) {
          await redis.set(`status:product:${slug}`, "sold");
          await redis.del(`lock:product:${slug}`);
        }

        const customerDetails = session.customer_details;
        const shippingDetails = session.shipping_details;
        const address = shippingDetails?.address ?? customerDetails?.address;

        try {
          await createOrderStory({
            orderId: session.id,
            productSlugs,
            status: "paid",
            customer: {
              name: shippingDetails?.name ?? customerDetails?.name ?? "Unknown",
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
      }
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const productSlugsRaw =
        session.metadata?.productSlugs ?? JSON.stringify([session.metadata?.productSlug]);
      const productSlugs = Array.isArray(productSlugsRaw)
        ? productSlugsRaw
        : (() => {
            try {
              return JSON.parse(productSlugsRaw ?? "[]") as string[];
            } catch {
              return session.metadata?.productSlug ? [session.metadata.productSlug] : [];
            }
          })();
      for (const slug of productSlugs) {
        await redis.del(`lock:product:${slug}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
