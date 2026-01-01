import StoryblokClient from "storyblok-js-client";
import BlockRenderer from "../../components/BlockRenderer";
import { notFound } from "next/navigation";

export default async function DynamicPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  const token = process.env.STORYBLOK_TOKEN;
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  try {
  const url =
    `https://api.storyblok.com/v2/cdn/stories/pages/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Storyblok ${res.status}: ${raw}`);
  }

  const data = JSON.parse(raw);
  const body = data.story?.content?.body ?? [];

    return (
      <main style={{ padding: "40px 16px", maxWidth: 1100, margin: "0 auto" }}>
        {body.map((blok: any) => (
          <BlockRenderer key={blok._uid} blok={blok} />
        ))}
      </main>
    );
} catch (e: any) {
  console.error("DynamicPage error:", e);

  return (
    <main style={{ padding: 40 }}>
      <h1>DynamicPage error</h1>

      <pre style={{ whiteSpace: "pre-wrap", color: "red" }}>
        {String(e?.message || e)}
      </pre>

      <p><b>slug:</b> {slug}</p>
      <p><b>STORYBLOK_TOKEN present:</b> {String(!!process.env.STORYBLOK_TOKEN)}</p>
      <p><b>STORYBLOK_TOKEN length:</b> {String(process.env.STORYBLOK_TOKEN?.length ?? 0)}</p>
    </main>
  );
}

}




