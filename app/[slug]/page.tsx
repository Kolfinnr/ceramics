import BlockRenderer from "../../components/BlockRenderer";
import { notFound } from "next/navigation";

export default async function DynamicPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  const url =
    `https://api.storyblok.com/v2/cdn/stories/pages/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (res.status === 404) return notFound();

  const raw = await res.text();
  if (!res.ok) throw new Error(`Storyblok ${res.status}: ${raw}`);

  const data = JSON.parse(raw);
  const body = data.story?.content?.body ?? [];

  return (
    <main style={{ padding: "40px 16px", maxWidth: 1100, margin: "0 auto" }}>
      {body.map((blok: any) => (
        <BlockRenderer key={blok._uid} blok={blok} />
      ))}
    </main>
  );
}













