import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";

type StoryblokStory = {
  id: number;
  name: string;
  slug: string;
  full_slug?: string;
  content?: {
    pcs?: number;
  };
};

type StoryblokStoriesResponse = {
  stories: StoryblokStory[];
};

const PER_PAGE = 100;
const STOCK_SYNC_LOCK_KEY = "stock_sync_lock";
const STOCK_LAST_SYNC_KEY = "stock_last_sync_ts";

function resolveSlug(story: StoryblokStory) {
  if (story.slug) return story.slug;
  if (story.full_slug) return story.full_slug.replace(/^products\//, "");
  return null;
}

async function fetchStoryblokPage(page: number, token: string) {
  const url =
    "https://api.storyblok.com/v2/cdn/stories" +
    `?starts_with=products&per_page=${PER_PAGE}&page=${page}` +
    `&version=published&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Storyblok CDN error: ${res.status} ${raw}`);
  }
  return JSON.parse(raw) as StoryblokStoriesResponse;
}

function isAuthorized(req: Request) {
  const expected = process.env.ADMIN_SYNC_TOKEN;
  if (!expected) {
    throw new Error("Missing ADMIN_SYNC_TOKEN");
  }

  const authHeader = req.headers.get("authorization");
  const tokenHeader = req.headers.get("x-admin-token");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : tokenHeader;
  return token === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing STORYBLOK_TOKEN" }, { status: 500 });
  }

  const lockAcquired = await redis.set(STOCK_SYNC_LOCK_KEY, "1", {
    nx: true,
    ex: 60 * 10,
  });
  if (!lockAcquired) {
    return NextResponse.json({ error: "Sync already running" }, { status: 409 });
  }

  const summary = {
    updated: 0,
    restocked: 0,
    skipped: 0,
    drift: 0,
    missingStock: 0,
    total: 0,
  };

  try {
    let page = 1;
    while (true) {
      const data = await fetchStoryblokPage(page, token);
      if (!data.stories || data.stories.length === 0) break;

      for (const story of data.stories) {
        summary.total += 1;
        const slug = resolveSlug(story);
        const stockValue = story.content?.pcs;
        if (!slug || typeof stockValue !== "number") {
          summary.missingStock += 1;
          continue;
        }

        const stockKey = `stock:product:${slug}`;
        const existingRaw = await redis.get<string>(stockKey);
        if (typeof existingRaw !== "string") {
          await redis.set(stockKey, String(stockValue));
          summary.updated += 1;
          continue;
        }

        const existing = Number(existingRaw);
        if (!Number.isFinite(existing)) {
          await redis.set(stockKey, String(stockValue));
          summary.updated += 1;
          continue;
        }

        if (stockValue > existing) {
          await redis.set(stockKey, String(stockValue));
          summary.restocked += 1;
          continue;
        }

        if (stockValue < existing) {
          summary.drift += 1;
          console.info("Stock drift detected", { slug, storyblok: stockValue, redis: existing });
          continue;
        }

        summary.skipped += 1;
      }

      page += 1;
    }

    await redis.set(STOCK_LAST_SYNC_KEY, String(Date.now()));
  } finally {
    await redis.del(STOCK_SYNC_LOCK_KEY);
  }

  return NextResponse.json({ ok: true, summary }, { status: 200 });
}
