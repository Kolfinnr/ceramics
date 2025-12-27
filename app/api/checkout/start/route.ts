import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis"; // <- use your existing Upstash client

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // If this causes issues, remove the apiVersion line
  apiVersion: "2025-01-27.acacia",
});

type ReqBody = {
  productSlug: string;
  productName: string;
  pricePLN: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as
      | ReqBody
      | {
          items?: Array<{
            productSlug: string;
            productName: string;
            pricePLN: number;
          }>;
        };

    const items =
      "items" in body && Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : "productSlug" in body
          ? [
              {
                productSlug: body.productSlug,
                productName: body.productName,
                pricePLN: body.pricePLN,
              },
            ]
          : [];

    const invalidItem = items.find(
      (item) =>
        !item.productSlug ||
        !item.productName ||
        typeof item.pricePLN !== "number" ||
        Number.isNaN(item.pricePLN),
    );

    const uniqueSlugs = new Set(items.map((item) => item.productSlug));

    if (items.length === 0 || invalidItem || uniqueSlugs.size !== items.length) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const lockTtlSeconds = 30 * 60;

    const lockedKeys: string[] = [];

    for (const item of items) {
      const statusKey = `status:product:${item.productSlug}`;
      const lockKey = `lock:product:${item.productSlug}`;

      const status = await redis.get<string>(statusKey);
      if (status === "sold") {
        for (const key of lockedKeys) {
          await redis.del(key);
        }
        return NextResponse.json({ error: "Sold" }, { status: 409 });
      }

      const locked = await redis.set(lockKey, "locked", {
        nx: true,
        ex: lockTtlSeconds,
      });
      if (!locked) {
        for (const key of lockedKeys) {
          await redis.del(key);
        }
        return NextResponse.json(
          { error: "Reserved by another buyer" },
          { status: 409 },
        );
      }

      lockedKeys.push(lockKey);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
    const productSlugs = items.map((item) => item.productSlug);
    const primarySlug = productSlugs[0];
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "pln",
          unit_amount: Math.round(item.pricePLN * 100),
          product_data: { name: item.productName },
        },
        quantity: 1,
      })),
      shipping_address_collection: { allowed_countries: ["PL", "CZ", "DE", "SK", "AT"] },
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + lockTtlSeconds,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel?product=${encodeURIComponent(primarySlug)}`,
      metadata: {
        productSlug: primarySlug,
        productSlugs: JSON.stringify(productSlugs),
      },
    });

    // Store session id as lock value (helps debugging)
    for (const item of items) {
      const lockKey = `lock:product:${item.productSlug}`;
      await redis.set(lockKey, session.id, { xx: true, ex: lockTtlSeconds });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
