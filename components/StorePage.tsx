import StoryblokClient from "storyblok-js-client";
import ProductCard from "./ProductCard";
import StoreGridClient from "./StoreGridClient";

export default async function StorePage({ blok }: { blok: any }) {
  const token = process.env.STORYBLOK_TOKEN;
  if (!token) {
    return <section style={{ padding: "40px 0" }}>Missing STORYBLOK_TOKEN</section>;
  }

  const sb = new StoryblokClient({ accessToken: token });

  const { data } = await sb.get("cdn/stories", {
    version: "draft",
    starts_with: "products/",
    is_startpage: false,
    per_page: 100,
    sort_by: "created_at:desc",
  });

  const products = data.stories ?? [];

  return (
    <section style={{ padding: "40px 0" }}>
      <h1 style={{ fontSize: 40, margin: 0 }}>{blok?.title || "Store"}</h1>
      {blok?.subtitle && (
        <p style={{ fontSize: 18, color: "#444", marginTop: 12 }}>
          {blok.subtitle}
        </p>
      )}

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StoreGridClient products={products.map((p: any) => ({
  uuid: p.uuid,
  name: p.name,
  slug: p.slug,
  content: p.content,
}))} />

      </div>
    </section>
  );
}
