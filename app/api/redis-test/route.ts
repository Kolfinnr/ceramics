import { redis } from "@/lib/redis";

export async function GET() {
  // write
  await redis.set("test-key", "hello ceramics");

  // read
  const value = await redis.get("test-key");

  return Response.json({
    ok: true,
    value,
  });
}
