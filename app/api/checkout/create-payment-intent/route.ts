import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";
import {
  cleanupExpiredPaymentIntentReservations,
  reserveStock,
  schedulePaymentIntentCleanup,
  type CheckoutItem,
} from "@/lib/checkout-reservation";
import { fetchStoryblokPcs } from "@/lib/storyblok-stock";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CustomerInfo = {
  email?: string;
  phone?: string;
  name?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
};

type ReqBody = {
  items: Array<{
    productSlug: string;
    productName: string;
    pricePLN: number;
    quantity?: number;
  }>;
  deliveryMethod: "courier" | "inpost";
  customer: CustomerInfo;
  allowBackorder?: boolean;
};

type CompactItem = {
  slug: string;
  name: string;
  quantity: number;
};

const releaseReservedStock = async (reservedBySlug: Record<string, number>) => {
  for (const [slug, reserved] of Object.entries(reservedBySlug)) {
    if (reserved > 0) {
      await redis.incrby(`reserve:product:${slug}`, -reserved);
    }
  }
};

export async function POST(req: Request) {
  const reservedInStockBySlug: Record<string, number> = {};

  try {
    const body = (await req.json()) as ReqBody;
    const itemsRaw = Array.isArray(body.items) ? body.items : [];

    const items: CheckoutItem[] = itemsRaw.map((item) => ({
      productSlug: item.productSlug,
      productName: item.productName,
      pricePLN: item.pricePLN,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
    }));

    const invalid = items.find((item) => {
      return (
        !item.productSlug ||
        !item.productName ||
        typeof item.pricePLN !== "number" ||
        Number.isNaN(item.pricePLN) ||
        item.pricePLN <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      );
    });

    if (items.length === 0 || invalid) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const allowBackorder = body.allowBackorder === true;
    const deliveryMethod: "courier" | "inpost" =
      body.deliveryMethod === "inpost" ? "inpost" : "courier";
    if (
      !body.customer?.email ||
      !body.customer?.phone ||
      !body.customer?.postalCode ||
      !body.customer?.street ||
      !body.customer?.city
    ) {
      return NextResponse.json(
        { error: "Missing customer details" },
        { status: 400 }
      );
    }

    // TODO: price validation should use server-side source of truth (Storyblok).
    const amount = items.reduce(
      (sum, item) => sum + Math.round(item.pricePLN * 100) * item.quantity,
      0
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const lockTtlSeconds = 30 * 60;
    await cleanupExpiredPaymentIntentReservations();

    const qtyBySlug = Object.fromEntries(
      items.map((item) => [item.productSlug, item.quantity])
    );

    await Promise.all(
      items.map(async (item) => {
        const pcs = await fetchStoryblokPcs(item.productSlug);
        if (typeof pcs === "number") {
          await redis.set(`stock:product:${item.productSlug}`, String(pcs));
        }
      })
    );

    const { reservedInStockBySlug: reservedBySlug, backorderBySlug } =
      await reserveStock(items);

    Object.assign(reservedInStockBySlug, reservedBySlug);

    const hasBackorder = Object.values(backorderBySlug).some((value) => value > 0);
    if (hasBackorder && !allowBackorder) {
      await releaseReservedStock(reservedBySlug);
      return NextResponse.json(
        {
          error:
            "Some items are no longer in stock right now. Continue again to place this as a made-to-order purchase (2–3 business weeks).",
          requiresBackorderConfirmation: true,
          backorderBySlug,
        },
        { status: 409 }
      );
    }

    const compactItems: CompactItem[] = items.map((item) => ({
      slug: item.productSlug,
      name: item.productName,
      quantity: item.quantity,
    }));

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "pln",
      automatic_payment_methods: { enabled: true },
      metadata: {
        delivery_method: deliveryMethod,
        customer_email: body.customer.email ?? "",
        customer_phone: body.customer.phone ?? "",
        customer_name: body.customer.name ?? "",
        shipping_street: body.customer.street ?? "",
        shipping_postal_code: body.customer.postalCode ?? "",
        shipping_city: body.customer.city ?? "",
        shipping_country: body.customer.country ?? "PL",
        cart_items_compact: JSON.stringify(compactItems),
        quantities: JSON.stringify(qtyBySlug),
        reserved_in_stock: JSON.stringify(reservedInStockBySlug),
        backorder: JSON.stringify(backorderBySlug),
      },
    });

    await redis.set(
      `reserve:payment_intent:${paymentIntent.id}`,
      JSON.stringify({ reservedInStockBySlug }),
      { ex: lockTtlSeconds }
    );
    await schedulePaymentIntentCleanup(
      paymentIntent.id,
      Date.now() + lockTtlSeconds * 1000
    );

    return NextResponse.json(
      {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    try {
      await releaseReservedStock(reservedInStockBySlug);
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
