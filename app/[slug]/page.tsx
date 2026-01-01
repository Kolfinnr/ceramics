import { notFound } from "next/navigation";

export default async function ProductDebugPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  const url =
    `https://api.storyblok.com/v2/cdn/stories/products/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (res.status === 404) return notFound();

  const raw = await res.text();
  if (!res.ok) throw new Error(`Storyblok ${res.status}: ${raw}`);

  const data = JSON.parse(raw);

  return (
    <main style={{ padding: 40 }}>
      <h1>PRODUCT ROUTE HIT ✅</h1>
      <p><b>slug:</b> {slug}</p>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data.story, null, 2)}
      </pre>
    </main>
  );
}

