import { notFound } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  // 1) Search for the product by slug, anywhere under products/
  const searchUrl =
    `https://api.storyblok.com/v2/cdn/stories` +
    `?version=published` +
    `&token=${encodeURIComponent(token)}` +
    `&starts_with=products/` +
    `&per_page=100` +
    `&is_startpage=false` +
    `&filter_query[slug][in]=${encodeURIComponent(slug)}`;

  const searchRes = await fetch(searchUrl, { next: { revalidate: 60 } });
  const searchRaw = await searchRes.text();

  if (!searchRes.ok) {
    throw new Error(`Storyblok search ${searchRes.status}: ${searchRaw}`);
  }

  const searchData = JSON.parse(searchRaw);
  const stories = searchData?.stories ?? [];

  if (!stories.length) return notFound();

  // If there are multiple matches, take the newest or the first.
  const story = stories[0];

  // 2) Render debug for now (so we confirm it's the right product)
  return (
    <main style={{ padding: 40 }}>
      <h1>Product found ✅</h1>
      <p>
        <b>URL slug:</b> {slug}
      </p>
      <p>
        <b>Storyblok full_slug:</b> {story.full_slug}
      </p>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(story, null, 2)}
      </pre>
    </main>
  );
}






