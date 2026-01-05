import StoryblokClient from "storyblok-js-client";
import StoreGridClient from "./StoreGridClient";
import { redis } from "@/lib/redis";

export default async function StorePage({ blok }: { blok: any }) {
  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) {
    return <section style={{ padding: "40px 0" }}>Missing STORYBLOK_TOKEN</section>;
  }

  const sb = new StoryblokClient({ accessToken: token });

  // ✅ IMPORTANT: use published in production
  const version = process.env.NODE_ENV === "production" ? "published" : "draft";

  const { data } = await sb.get("cdn/stories", {
    version,
    starts_with: "products/",
    is_startpage: false,
    per_page: 100,
    sort_by: "created_at:desc",
  });

  // 1) Normalize Storyblok stories
  const products = (data.stories ?? [])
    .filter((p: any) => typeof p?.slug === "string" && p.slug.length > 0)
    .map((p: any) => ({
      uuid: p.uuid,
      slug: p.slug,
      name: p.name,
      content: p.content,
    }));

  // 2) Seed/overlay stock from Redis into content.pcs (available-now count)
  const productsWithStock = await Promise.all(
    products.map(async (p: any) => {
      const stockKey = `stock:product:${p.slug}`;
      let stock = await redis.get<number>(stockKey);

      if (stock === null || stock === undefined) {
        const seeded = Number(p.content?.pcs ?? 1);
        stock = Number.isFinite(seeded) ? seeded : 1;
        await redis.set(stockKey, stock);
      }

      return {
        ...p,
        content: {
          ...(p.content ?? {}),
          pcs: stock,
        },
      };
    })
  );

  return (
    <section style={{ padding: "40px 0" }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>{blok?.title || "Store"}</h1>
      <StoreGridClient products={productsWithStock} />
    </section>
  );
}





