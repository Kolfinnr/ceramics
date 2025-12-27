import { redis } from "@/lib/redis";

export function productLockKey(productSlug: string) {
  return `lock:product:${productSlug}`;
}

/**
 * Try to lock a product for ttlSeconds.
 * Returns true if lock acquired, false if already locked.
 */
export async function acquireProductLock(productSlug: string, ttlSeconds = 15 * 60) {
  const key = productLockKey(productSlug);

  // SET key value NX EX ttl
  // Upstash SDK supports options object:
  const result = await redis.set(key, "1", { nx: true, ex: ttlSeconds });

  // result is "OK" when set, otherwise null
  return result === "OK";
}

export async function isProductLocked(productSlug: string) {
  const key = productLockKey(productSlug);
  const value = await redis.get(key);
  return value !== null;
}

export async function releaseProductLock(productSlug: string) {
  const key = productLockKey(productSlug);
  await redis.del(key);
}
