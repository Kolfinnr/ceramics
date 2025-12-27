// lib/upstash.ts
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
}

async function upstash<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await res.json();
  // Upstash returns { result: ... }
  if (!res.ok) throw new Error(`Upstash error: ${res.status} ${JSON.stringify(data)}`);
  return data.result as T;
}

/** Try to create a lock key with TTL (seconds). Returns true if lock acquired. */
export async function acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
  // SET key value NX EX ttl
  // REST: /set/<key>/<value>?nx=true&ex=<ttl>
  const value = "1";
  const result = await upstash<string | null>(
    `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?nx=true&ex=${ttlSeconds}`,
    { method: "POST" }
  );
  // Upstash returns "OK" if set, null if not set (NX failed)
  return result === "OK";
}

export async function getValue(key: string): Promise<string | null> {
  return await upstash<string | null>(`/get/${encodeURIComponent(key)}`, { method: "GET" });
}

export async function setValue(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const ex = ttlSeconds ? `?ex=${ttlSeconds}` : "";
  await upstash(`/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}${ex}`, {
    method: "POST",
  });
}

export async function delKey(key: string): Promise<void> {
  await upstash(`/del/${encodeURIComponent(key)}`, { method: "POST" });
}
