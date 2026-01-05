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
    version: "published",
    starts_with: "products/",
    is_startpage: false,
    per_page: 100,
    sort_by: "created_at:desc",
  });

const products = (data.stories ?? [])
  // keep only real product stories that actually have a slug
  .filter((p: any) => typeof p?.slug === "string" && p.slug.length > 0)
  // normalize the shape so ProductCard always receives { slug, name, content, uuid }
  .map((p: any) => ({
    uuid: p.uuid,
    slug: p.slug, // <- MUST exist
    name: p.name,
    content: p.content,
  }));

// ✅ Overlay "sold" state from Redis onto normalized products
const productsWithAvailability = await Promise.all(
  products.map(async (p: any) => {
    const sold =
      (await redis.get<string>(`status:product:${p.slug}`)) === "sold";

    return {
      ...p,
      content: {
        ...(p.content ?? {}),
        // If sold in Redis, force status=false (your UI already greys out when status === false)
        status: sold ? false : (p.content?.status ?? true),
      },
    };
  })
);

return (
  <section style={{ padding: "40px 0" }}>
    <h1 style={{ fontSize: 40, margin: 0 }}>{blok?.title || "Store"}</h1>

    <StoreGridClient products={productsWithAvailability} />
  </section>
)




