import StoryblokClient from "storyblok-js-client";
import StoreGridClient from "./StoreGridClient";
import { redis } from "@/lib/redis";
import {
  ProductContent,
  ProductStory,
  StoryblokBlock,
} from "@/lib/storyblok-types";
import { cleanupExpiredPaymentIntentReservations } from "@/lib/checkout-reservation";

type StorePageBlock = StoryblokBlock & {
  title?: string;
};

type StoriesResponse = {
  stories?: ProductStory[];
};

export default async function StorePage({ blok }: { blok: StorePageBlock }) {
  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) {
    return <section style={{ padding: "40px 0" }}>Missing STORYBLOK_TOKEN</section>;
  }

  const sb = new StoryblokClient({ accessToken: token });

  // ✅ IMPORTANT: use published in production
  const version = process.env.NODE_ENV === "production" ? "published" : "draft";

  const { data } = (await sb.get("cdn/stories", {
    version,
    starts_with: "products/",
    is_startpage: false,
    per_page: 100,
    sort_by: "created_at:desc",
  })) as { data: StoriesResponse };

  // 1) Normalize Storyblok stories
  await cleanupExpiredPaymentIntentReservations();
  const products = (data.stories ?? [])
    .filter((p): p is ProductStory => typeof p?.slug === "string" && p.slug.length > 0)
    .map((p) => ({
      uuid: p.uuid,
      slug: p.slug,
      name: p.name,
      content: p.content as ProductContent | undefined,
    }));

  // 2) Seed/overlay stock from Redis into content.pcs (available-now count)
  const productsWithStock = await Promise.all(
    products.map(async (p) => {
      const stockKey = `stock:product:${p.slug}`;
      const reserveKey = `reserve:product:${p.slug}`;
      let stock = await redis.get<number>(stockKey);
      const reserved = (await redis.get<number>(reserveKey)) ?? 0;

      if (stock === null || stock === undefined) {
        const seeded = Number(p.content?.pcs ?? 1);
        stock = Number.isFinite(seeded) ? seeded : 1;
        await redis.set(stockKey, stock);
      }

      return {
        ...p,
        content: {
          ...(p.content ?? {}),
          pcs: Math.max(0, stock - reserved),
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





