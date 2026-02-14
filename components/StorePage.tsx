import StoryblokClient from "storyblok-js-client";
import StoreGridClient from "./StoreGridClient";
import { redis } from "@/lib/redis";
import {
  ProductContent,
  ProductStory,
  StoryblokBlock,
} from "@/lib/storyblok-types";

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
  const version = process.env.NODE_ENV === "production" ? "published" : "draft";

  const { data } = (await sb.get("cdn/stories", {
    version,
    starts_with: "products/",
    is_startpage: false,
    per_page: 100,
    sort_by: "created_at:desc",
  })) as { data: StoriesResponse };

  const products = (data.stories ?? [])
    .filter((p): p is ProductStory => typeof p?.slug === "string" && p.slug.length > 0)
    .map((p) => ({
      uuid: p.uuid,
      slug: p.slug,
      name: p.name,
      content: p.content as ProductContent | undefined,
    }));

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
    <section className="surface-shell">
      <div className="store-hero">
        <div>
          <p className="brand-script" style={{ margin: 0, fontSize: 24 }}>
            handmade collection
          </p>
          <h1 className="brand-display">{blok?.title || "Store"}</h1>
          <p>
            Refined store styling with earthy tones, soft-paper surfaces, and editorial type rhythm to
            match the ceramic brand identity while keeping commits text-only.
          </p>
        </div>
        <div className="store-hero-media" />
      </div>
      <StoreGridClient products={productsWithStock} />
    </section>
  );
}
