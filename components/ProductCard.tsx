"use client";

import { ProductStory } from "@/lib/storyblok-types";

type CardVariant = "default" | "tall" | "wide";

export default function ProductCard({
  product,
  onOpen,
  variant = "default",
}: {
  product: ProductStory;
  onOpen: (slug: string) => void;
  variant?: CardVariant;
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
      className={`store-card store-card--${variant}`}
      style={{
        display: "grid",
        gridTemplateRows: "minmax(0, 1fr) auto",
        gap: 10,
        height: "100%",
        width: "100%",
        textAlign: "left",
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 12,
        background: "#fff",
        cursor: "pointer",
        color: "inherit",
        opacity: available ? 1 : 0.7,
        overflow: "hidden",
      }}
    >
      {img && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            border: "1px solid #eee",
            background: "#fafafa",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={photos?.[0]?.alt || ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>

        {typeof price === "number" && <div style={{ color: "#444" }}>{price} PLN</div>}

        {!available && <div style={{ color: "#b00", fontWeight: 800 }}>Sold</div>}
      </div>
    </button>
  );
}







