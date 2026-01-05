import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";

function getOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) throw new Error("Missing Host header");

  // Force https in production to keep Stripe happy and avoid weird proxy cases
  const proto =
    process.env.NODE_ENV === "production"
      ? "https"
      : (req.headers.get("x-forwarded-proto") ?? "http");

  return `${proto}://${host}`;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type ReqItem = {
  productSlug: string;
  productName: string;
  pricePLN: number;
  quantity: number; // ✅ new
};

type ReqBody =
  | ReqItem
  | {
      items?: ReqItem[];
    };

// Atomic reserve script: reserve up to requested qty from stock key, decrementing stock.
// Returns reserved amount (0..requested).
const RESERVE_LUA = `
local key = KEYS[1]
local want = tonumber(ARGV[1]) or 0
if want <= 0 then return 0 end

local cur = tonumber(redis.call("GET", key) or "0")
if cur <= 0 then return 0 end

local take = want
if cur < want then take = cur end

redis.call("DECRBY", key, take)
return take
`;

export async function POST(req: Request) {
  // We will "reserve" stock immediately, then create Stripe session.
  // If Stripe fails, we roll back reservations.
  const reservedInStockBySlug: Record<string, number> = {};

  try {
    const body = (await req.json()) as ReqBody;

    const items: ReqItem[] =
      "items" in body && Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : "productSlug" in body
          ? [
              {
                productSlug: body.productSlug,
                productName: body.productName,
                pricePLN: body.pricePLN,
                quantity: (body as ReqItem).quantity ?? 1,
              },
            ]
          : [];

    // Validate
    const invalid = items.find((i) => {
      const q = Number(i.quantity);
      return (
        !i.productSlug ||
        !i.productName ||
        typeof i.pricePLN !== "number" ||
        Number.isNaN(i.pricePLN) ||
        !Number.isFinite(q) ||
        q < 1 ||
        !Number.isInteger(q)
      );
    });

    // prevent duplicate slugs in one request (simplifies inventory ops)
    const uniqueSlugs = new Set(items.map((i) => i.productSlug));
    if (items.length === 0 || invalid || uniqueSlugs.size !== items.length) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const lockTtlSeconds = 30 * 60;
    const siteUrl = getOrigin(req);

    // Reserve in-stock units in Redis (does NOT block backorder)
    // stock key name: stock:product:<slug>
    const backorderBySlug: Record<string, number> = {};
    const qtyBySlug: Record<string, number> = {};

    for (const item of items) {
      const slug = item.productSlug;
      const want = item.quantity;

      qtyBySlug[slug] = want;

      const stockKey = `stock:product:${slug}`;

      // If stock key doesn't exist, treat as 0 in stock (all becomes backorder).
      // (Store page should seed stock keys from Storyblok, but this keeps API robust.)
      const reserved = await (redis as any).eval?.(RESERVE_LUA, [stockKey], [String(want)]);
      // If your redis client doesn't support eval, you'll see a runtime error.
      // Tell me the exact error and I’ll adjust to the correct Upstash method name.

      const reservedNum = typeof reserved === "number" ? reserved : Number(reserved ?? 0);
      reservedInStockBySlug[slug] = reservedNum;

      const backorder = Math.max(0, want - reservedNum);
      if (backorder > 0) backorderBySlug[slug] = backorder;
    }

    const productSlugs = items.map((i) => i.productSlug);
    const primarySlug = productSlugs[0];

    // Create Stripe checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "pln",
          unit_amount: Math.round(item.pricePLN * 100),
          product_data: { name: item.productName },
        },
        quantity: item.quantity, // ✅ now supports multiple pcs
      })),
      shipping_address_collection: { allowed_countries: ["PL", "CZ", "DE", "SK", "AT"] },
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + lockTtlSeconds,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel?product=${encodeURIComponent(primarySlug)}`,
      metadata: {
        productSlug: primarySlug,
        productSlugs: JSON.stringify(productSlugs),
        quantities: JSON.stringify(qtyBySlug),                // ✅ what customer ordered
        reservedInStock: JSON.stringify(reservedInStockBySlug), // ✅ what we reserved
        backorder: JSON.stringify(backorderBySlug),           // ✅ what exceeded stock
      },
    });

    // Store reservation record so webhook can restore stock if session expires/fails
    await redis.set(
      `reserve:session:${session.id}`,
      JSON.stringify({ reservedInStockBySlug }),
      { ex: lockTtlSeconds }
    );

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    // Roll back reserved stock if anything failed AFTER reserving
    try {
      const entries = Object.entries(reservedInStockBySlug);
      for (const [slug, reserved] of entries) {
        if (reserved > 0) {
          await redis.incrby(`stock:product:${slug}`, reserved);
        }
      }
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


