type StoryblokStory = {
  content?: {
    pcs?: number;
  };
};

type StoryblokStoryResponse = {
  story?: StoryblokStory;
};

export async function fetchStoryblokPcs(slug: string): Promise<number | null> {
  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) {
    throw new Error("Missing STORYBLOK_TOKEN");
  }

  const url =
    `https://api.storyblok.com/v2/cdn/stories/products/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Storyblok CDN error: ${res.status} ${raw}`);
  }

  const data = JSON.parse(raw) as StoryblokStoryResponse;
  const pcs = data.story?.content?.pcs;
  return typeof pcs === "number" && Number.isFinite(pcs) ? pcs : null;
}
