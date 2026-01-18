"use client";

import { ProductStory } from "@/lib/storyblok-types";

export default function ProductCard({
  product,
  onOpen,
}: {
  product: ProductStory;
  onOpen: (slug: string) => void;
}) {
  const slug = product?.slug;
  const content = product?.content ?? {};

  if (!slug) {
    return (
      <div style={{ border: "2px solid red", padding: 12, borderRadius: 12 }}>
        <b>Product missing slug</b>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(product, null, 2)}</pre>
      </div>
    );
  }

  const title = content?.name || product?.name || "Product";
  const price = content?.price_pln;
  const photos = content?.photos || [];
  const img = photos?.[0]?.filename;
  const available = content?.status !== false;

  return (
    <button
      type="button"
      onClick={() => onOpen(slug)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 12,
        background: "#fff",
        cursor: "pointer",
        color: "inherit",
        opacity: available ? 1 : 0.7,
      }}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={photos?.[0]?.alt || ""}
          style={{
            width: "100%",
            height: 260,
            objectFit: "cover",
            borderRadius: 12,
            border: "1px solid #eee",
          }}
        />
      )}

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>

        {typeof price === "number" && <div style={{ color: "#444" }}>{price} PLN</div>}

        {!available && <div style={{ color: "#b00", fontWeight: 800 }}>Sold</div>}
      </div>
    </button>
  );
}







