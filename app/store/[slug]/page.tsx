import { notFound } from "next/navigation";
import CeramicItem from "../../../components/CeramicItem"; // <-- adjust if your path differs

export const revalidate = 60;

export default async function StoreItemPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  // 1) Find the product anywhere under products/ by matching slug
  const listUrl =
    `https://api.storyblok.com/v2/cdn/stories` +
    `?version=published` +
    `&token=${encodeURIComponent(token)}` +
    `&starts_with=products/` +
    `&is_startpage=false` +
    `&per_page=100` +
    `&filter_query[slug][in]=${encodeURIComponent(slug)}`;

  const listRes = await fetch(listUrl, { next: { revalidate } });

  if (listRes.status === 404) return notFound();

  const listRaw = await listRes.text();
  if (!listRes.ok) throw new Error(`Storyblok list ${listRes.status}: ${listRaw}`);

  const listData = JSON.parse(listRaw);
  const story = listData?.stories?.[0];

  if (!story) return notFound();

  // 2) Render the product
  // story.content is the blok (component: CeramicItem etc.)
  return (
    <main style={{ padding: "40px 16px", maxWidth: 1100, margin: "0 auto" }}>
      <CeramicItem blok={story.content} />
    </main>
  );
}








