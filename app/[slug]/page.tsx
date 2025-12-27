import StoryblokClient from "storyblok-js-client";
import BlockRenderer from "../../components/BlockRenderer";
import { notFound } from "next/navigation";

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const token = process.env.STORYBLOK_TOKEN;
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  const sb = new StoryblokClient({ accessToken: token });

  try {
    const { data } = await sb.get(`cdn/stories/pages/${slug}`, { version: "draft" });
    const body = data.story?.content?.body ?? [];

    return (
      <main style={{ padding: "40px 16px", maxWidth: 1100, margin: "0 auto" }}>
        {body.map((blok: any) => (
          <BlockRenderer key={blok._uid} blok={blok} />
        ))}
      </main>
    );
  } catch (e: any) {
    // Storyblok returns 404 when story slug doesn't exist
    return notFound();
  }
}
