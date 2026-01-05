import { Redis } from "@upstash/redis";
await redis.eval(script, [key1, key2], [arg1, arg2])

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

