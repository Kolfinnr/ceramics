import { redis } from "@/lib/redis";

const RESERVE_LUA = `
local stockKey = KEYS[1]
local reserveKey = KEYS[2]
local want = tonumber(ARGV[1])

local stock = tonumber(redis.call("GET", stockKey) or "0")
local reserved = tonumber(redis.call("GET", reserveKey) or "0")
local available = stock - reserved
if available <= 0 then
  return 0
end

local take = want
if take > available then take = available end

redis.call("INCRBY", reserveKey, take)
return take
`;

export type CheckoutItem = {
  productSlug: string;
  productName: string;
  pricePLN: number;
  quantity: number;
};

const PAYMENT_INTENT_CLEANUP_KEY = "reserve:cleanup:payment_intent";

export async function reserveStock(items: CheckoutItem[]) {
  const reservedInStockBySlug: Record<string, number> = {};
  const backorderBySlug: Record<string, number> = {};

  for (const item of items) {
    const slug = item.productSlug;
    const want = item.quantity;

    const stockKey = `stock:product:${slug}`;
    const reserveKey = `reserve:product:${slug}`;
    const reservedRaw = await redis.eval(
      RESERVE_LUA,
      [stockKey, reserveKey],
      [String(want)]
    );

    const reserved = Number(reservedRaw ?? 0);
    reservedInStockBySlug[slug] = reserved;

    const backorder = Math.max(0, want - reserved);
    backorderBySlug[slug] = backorder;
  }

  return { reservedInStockBySlug, backorderBySlug };
}

export async function cleanupExpiredPaymentIntentReservations(now = Date.now()) {
  const expired = await redis.zrange<string[]>(
    PAYMENT_INTENT_CLEANUP_KEY,
    0,
    now,
    { byScore: true }
  );

  if (!expired || expired.length === 0) return;

  for (const intentId of expired) {
    const reserveKey = `reserve:payment_intent:${intentId}`;
    const reserveRaw = await redis.get(reserveKey);
    if (reserveRaw) {
      try {
        const parsed = JSON.parse(reserveRaw) as {
          reservedInStockBySlug?: Record<string, number>;
        };
        const reservedInStockBySlug = parsed.reservedInStockBySlug ?? {};
        for (const [slug, reserved] of Object.entries(reservedInStockBySlug)) {
          if (reserved > 0) {
            await redis.incrby(`reserve:product:${slug}`, -reserved);
          }
        }
      } catch {
        // ignore malformed payloads
      }
    }
    await redis.del(reserveKey);
    await redis.zrem(PAYMENT_INTENT_CLEANUP_KEY, intentId);
  }
}

export async function schedulePaymentIntentCleanup(intentId: string, expiresAtMs: number) {
  await redis.zadd(PAYMENT_INTENT_CLEANUP_KEY, {
    score: expiresAtMs,
    member: intentId,
  });
}

export async function removePaymentIntentCleanup(intentId: string) {
  await redis.zrem(PAYMENT_INTENT_CLEANUP_KEY, intentId);
}
