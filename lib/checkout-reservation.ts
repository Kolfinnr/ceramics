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
