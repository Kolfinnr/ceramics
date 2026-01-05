import BlockRenderer from "../components/BlockRenderer"; // adjust if your components folder differs
import { notFound } from "next/navigation";

export const revalidate = 60;

async function fetchStory(fullSlug: string, token: string) {
  const url =
    `https://api.storyblok.com/v2/cdn/stories/${encodeURIComponent(fullSlug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { next: { revalidate } });
  if (res.status === 404) return null;

  const raw = await res.text();
  if (!res.ok) throw new Error(`Storyblok ${res.status}: ${raw}`);

  return JSON.parse(raw);
}

export default async function DynamicPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  // Candidates in priority order
  const candidates = [
    `pages/${slug}`,
    slug, // if you accidentally put pages at root in Storyblok
    `pages/${slug}/home`, // optional pattern some people use
  ];

  let data: any = null;
  for (const fullSlug of candidates) {
    data = await fetchStory(fullSlug, token);
    if (data?.story) break;
  }

  if (!data?.story) return notFound();

  const body = data.story?.content?.body ?? [];

  return (
    <main style={{ padding: "40px 16px", maxWidth: 1100, margin: "0 auto" }}>
      {Array.isArray(body) ? (
        body.map((blok: any) => <BlockRenderer key={blok._uid} blok={blok} />)
      ) : (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(data.story?.content, null, 2)}
        </pre>
      )}
    </main>
  );
}







