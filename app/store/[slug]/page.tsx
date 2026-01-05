import { notFound } from "next/navigation";
import CeramicItem from "../../../components/CeramicItem"; // adjust if needed

export const revalidate = 60;

export default async function StoreItemPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  const url =
    `https://api.storyblok.com/v2/cdn/stories/products/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { next: { revalidate } });
  if (res.status === 404) return notFound();

  const raw = await res.text();
  if (!res.ok) throw new Error(`Storyblok ${res.status}: ${raw}`);

  const data = JSON.parse(raw);
  if (!data?.story) return notFound();

  return (
    <main style={{ padding: "40px 16px", maxWidth: 1100, margin: "0 auto" }}>
      <CeramicItem story={data.story} />
    </main>
  );
}








