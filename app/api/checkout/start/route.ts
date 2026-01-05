import { NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/redis";

function getOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) throw new Error("Missing Host header");

  const proto =
    process.env.NODE_ENV === "production"
      ? "https"
      : req.headers.get("x-forwarded-proto") ?? "http";

  return `${proto}://${host}`;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const RESERVE_LUA = `
local key = KEYS[1]
local want = tonumber(ARGV[1])

local current = tonumber(redis.call("GET", key) or "0")
if current <= 0 then
  return 0
end

local take = want
if take > current then take = current end

redis.call("DECRBY", key, take)
return take
`;

type ReqItem = {
  productSlug: string;
  productName: string;
  pricePLN: number;
  quantity: number;
};

type ReqBody =
  | ReqItem
  | {
      items?: ReqItem[];
      // New fields from CartView:
      deliveryMethod?: "courier" | "inpost";
      inpostPoint?: any;

      // Back-compat if you used "delivery" earlier:
      delivery?: { method?: "courier" | "inpost"; inpostPoint?: any };
    };

export async function POST(req: Request) {
  const reservedInStockBySlug: Record<string, number> = {};

  try {
    const body = (await req.json()) as ReqBody;

    // Accept both formats:
    const deliveryMethod: "courier" | "inpost" =
      (typeof (body as any).deliveryMethod === "string"
        ? (body as any).deliveryMethod
        : (body as any).delivery?.method) === "inpost"
        ? "inpost"
        : "courier";

    const inpostPoint =
      deliveryMethod === "inpost"
        ? (body as any).inpostPoint ?? (body as any).delivery?.inpostPoint ?? null
        : null;

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

    // Validate items
    const invalid = items.find((i) => {
      const q = Number(i.quantity);
      return (
        !i.productSlug ||
        !i.productName ||
        typeof i.pricePLN !== "number" ||
        Number.isNaN(i.pricePLN) ||
        !Number.isFinite(q) ||
        !Number.isInteger(q) ||
        q < 1
      );
    });

    // no duplicate slugs in one request (simplifies stock math)
    const uniqueSlugs = new Set(items.map((i) => i.productSlug));
    if (items.length === 0 || invalid || uniqueSlugs.size !== items.length) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const lockTtlSeconds = 30 * 60;
    const siteUrl = getOrigin(req);

    const qtyBySlug: Record<string, number> = {};
    const backorderBySlug: Record<string, number> = {};

    // Reserve in-stock units (allow backorder)
    for (const item of items) {
      const slug = item.productSlug;
      const want = item.quantity;

      qtyBySlug[slug] = want;

      const stockKey = `stock:product:${slug}`;

      // If stock key is missing, treat it as 0 in stock (all backorder).
      const reservedRaw = await redis.eval(RESERVE_LUA, [stockKey], [
        String(want),
      ]);

      const reserved = Number(reservedRaw ?? 0);
      reservedInStockBySlug[slug] = reserved;

      const backorder = Math.max(0, want - reserved);
      backorderBySlug[slug] = backorder;
    }

    const primarySlug = items[0]!.productSlug;
    const productSlugs = items.map((i) => i.productSlug);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "pln",
          unit_amount: Math.round(item.pricePLN * 100),
          product_data: { name: item.productName },
        },
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ["PL", "CZ", "DE", "SK", "AT"],
      },
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + lockTtlSeconds,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel?product=${encodeURIComponent(primarySlug)}`,
      metadata: {
        productSlug: primarySlug,
        productSlugs: JSON.stringify(productSlugs),
        quantities: JSON.stringify(qtyBySlug),
        reservedInStock: JSON.stringify(reservedInStockBySlug),
        backorder: JSON.stringify(backorderBySlug),

        // ✅ delivery info
        deliveryMethod,
        inpostPoint: inpostPoint ? JSON.stringify(inpostPoint) : "",
      },
    });

    // Store reservation record so webhook can restore stock on expire/fail
    await redis.set(
      `reserve:session:${session.id}`,
      JSON.stringify({ reservedInStockBySlug }),
      { ex: lockTtlSeconds }
    );

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    // Roll back reserved stock if Stripe/session creation failed
    try {
      for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
        if (reserved > 0) {
          await redis.incrby(`stock:product:${slug}`, reserved);
        }
      }
    } catch (rollbackErr) {
      console.error("Rollback failed:", rollbackErr);
    }

    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}





