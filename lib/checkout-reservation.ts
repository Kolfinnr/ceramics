import { redis } from "@/lib/redis";

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
    const reservedRaw = await redis.eval(RESERVE_LUA, [stockKey], [String(want)]);

    const reserved = Number(reservedRaw ?? 0);
    reservedInStockBySlug[slug] = reserved;

    const backorder = Math.max(0, want - reserved);
    backorderBySlug[slug] = backorder;
  }

  return { reservedInStockBySlug, backorderBySlug };
}
