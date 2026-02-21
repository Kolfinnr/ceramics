import Link from "next/link";
import StoryblokClient from "storyblok-js-client";
import { redis } from "@/lib/redis";
import {
  ProductContent,
  ProductStory,
  StoryblokBlock,
  StoryblokLink,
} from "@/lib/storyblok-types";

type FeaturedGridBlock = StoryblokBlock & {
  title?: string;
  intro?: string;
  mode?: "auto_random" | "manual_featured" | "seasonal";
  items_limit?: number | string;
  rotate_every_hours?: number | string;
  include_out_of_stock?: boolean;
  manual_items?: Array<StoryblokLink | string>;
  season_key?: string;
  seasonal_categories?: string[];
};

type StoriesResponse = {
  stories?: ProductStory[];
};

type FeaturedItem = {
  slug: string;
  name: string;
  price: number | null;
  photo: string | null;
  photoAlt: string;
  categories: string[];
  availableNow: number;
};

const toInt = (value: number | string | undefined, fallback: number) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.floor(numeric);
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeSlug = (value: string) =>
  value
    .replace(/^\/+/, "")
    .replace(/^products\//, "")
    .split("/")
    .filter(Boolean)
    .pop() ?? value;

const linkToSlug = (link: StoryblokLink | string): string | null => {
  if (typeof link === "string" && link.length > 0) return normalizeSlug(link);
  if (!link || typeof link !== "object") return null;

  if (typeof link.story?.full_slug === "string" && link.story.full_slug.length > 0) {
    return normalizeSlug(link.story.full_slug);
  }

  if (typeof link.cached_url === "string" && link.cached_url.length > 0) {
    return normalizeSlug(link.cached_url);
  }

  if (typeof link.url === "string" && link.url.length > 0) {
    return normalizeSlug(link.url);
  }

  return null;
};

const hashSeed = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed: number) => {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) & 0xffffffff) / 0x100000000;
  };
};

const seededShuffle = <T,>(items: T[], seedInput: string): T[] => {
  const arr = [...items];
  const rand = makeRng(hashSeed(seedInput));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

async function fetchProductsWithAvailability(): Promise<FeaturedItem[]> {
  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return [];

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
    .map((p) => {
      const content = (p.content ?? {}) as ProductContent;
      const photos = Array.isArray(content.photos) ? content.photos : [];
      const priceRaw = content.price_pln;
      const price =
        typeof priceRaw === "number"
          ? priceRaw
          : typeof priceRaw === "string"
            ? Number(priceRaw.replace(",", "."))
            : null;
      const categories = Array.isArray(content.category)
        ? content.category.filter((value): value is string => typeof value === "string")
        : [];

      return {
        slug: normalizeSlug(p.slug),
        name: content.name || p.name || "Product",
        price: Number.isFinite(price) ? price : null,
        photo: photos[0]?.filename ?? null,
        photoAlt: photos[0]?.alt ?? "",
        categories,
      };
    });

  return await Promise.all(
    products.map(async (product) => {
      const stockKey = `stock:product:${product.slug}`;
      const reserveKey = `reserve:product:${product.slug}`;
      let stock = await redis.get<number>(stockKey);
      const reserved = (await redis.get<number>(reserveKey)) ?? 0;

      if (stock === null || stock === undefined) {
        stock = 0;
      }

      return {
        ...product,
        availableNow: Math.max(0, stock - reserved),
      };
    })
  );
}

function selectFeaturedItems(blok: FeaturedGridBlock, all: FeaturedItem[]) {
  const mode = blok.mode ?? "auto_random";
  const limit = clamp(toInt(blok.items_limit, 6), 1, 24);
  const includeOutOfStock = blok.include_out_of_stock === true;
  const pool = includeOutOfStock ? all : all.filter((item) => item.availableNow > 0);

  if (mode === "manual_featured") {
    const selection = Array.isArray(blok.manual_items)
      ? blok.manual_items.map(linkToSlug).filter((slug): slug is string => Boolean(slug))
      : [];
    const bySlug = new Map(pool.map((item) => [item.slug, item]));
    const picked = selection
      .map((slug) => bySlug.get(slug))
      .filter((item): item is FeaturedItem => Boolean(item));
    return picked.slice(0, limit);
  }

  if (mode === "seasonal") {
    const seasonKey = (blok.season_key ?? "").trim().toLowerCase();
    const seasonCategories = Array.isArray(blok.seasonal_categories)
      ? blok.seasonal_categories.map((value) => value.toLowerCase())
      : [];

    const seasonal = pool.filter((item) => {
      const categories = item.categories.map((value) => value.toLowerCase());
      const byList = seasonCategories.length > 0 && seasonCategories.some((cat) => categories.includes(cat));
      const byKey = seasonKey.length > 0 && categories.some((cat) => cat.includes(seasonKey));
      return byList || byKey;
    });

    return seasonal.slice(0, limit);
  }

  const rotateHours = clamp(toInt(blok.rotate_every_hours, 24), 1, 24 * 30);
  const bucket = Math.floor(Date.now() / (rotateHours * 60 * 60 * 1000));
  const shuffled = seededShuffle(pool, `${blok._uid ?? "featured-grid"}:${bucket}`);
  return shuffled.slice(0, limit);
}

export default async function FeaturedGrid({ blok }: { blok: FeaturedGridBlock }) {
  const allProducts = await fetchProductsWithAvailability();
  const featured = selectFeaturedItems(blok, allProducts);

  return (
    <section style={{ padding: "40px 0" }}>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>{blok.title ?? "Featured"}</h2>
      {blok.intro && <p style={{ color: "#5e5246", marginTop: 0 }}>{blok.intro}</p>}

      {featured.length === 0 ? (
        <p style={{ color: "#6a5b4e" }}>No featured products available right now.</p>
      ) : (
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {featured.map((item) => (
            <Link
              key={item.slug}
              href={`/store/${item.slug}`}
              style={{
                display: "grid",
                gap: 8,
                textDecoration: "none",
                color: "inherit",
                border: "1px solid #d9cbb8",
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.55)",
                padding: 10,
              }}
            >
              {item.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.photo}
                  alt={item.photoAlt || item.name}
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eadfce",
                  }}
                />
              )}
              <strong style={{ fontSize: 18 }}>{item.name}</strong>
              {typeof item.price === "number" && <span>{item.price} PLN</span>}
              <span style={{ fontSize: 13, color: item.availableNow > 0 ? "#355a2f" : "#8c4d0f" }}>
                {item.availableNow > 0
                  ? `${item.availableNow} ready now`
                  : "Made to order (2–3 weeks)"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
