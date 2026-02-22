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

  const normalizedContent = content as { title?: string; name?: string };
  const title = normalizedContent.title || normalizedContent.name || product?.name || "Product";
  const rawPrice = content?.price_pln;
  const price =
    typeof rawPrice === "number"
      ? rawPrice
      : typeof rawPrice === "string"
        ? Number(rawPrice.replace(",", "."))
        : null;
  const photos = content?.photos || [];
  const img = photos?.[0]?.filename;
  const available = content?.status !== false;
  const pcs = Number(content?.pcs);
  const availableNow = Number.isFinite(pcs) ? Math.max(0, pcs) : available ? 1 : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(slug)}
      className={`store-card store-card--${variant}`}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "1px solid #eee",
        borderRadius: 14,
        background: "#fff",
        cursor: "pointer",
        color: "inherit",
        opacity: available ? 1 : 0.7,
        overflow: "hidden",
        padding: 0,
      }}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={photos?.[0]?.alt || ""}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            objectFit: "cover",
            borderBottom: "1px solid #eee",
          }}
        />
      )}

      <div style={{ padding: "10px 12px", display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>

        {Number.isFinite(price) && <div style={{ color: "#444" }}>{price} PLN</div>}

        <div style={{ fontSize: 13, color: availableNow > 0 ? "#355a2f" : "#8c4d0f" }}>
          {availableNow > 0 ? `${availableNow} ready now` : "Made to order (2–3 weeks)"}
        </div>
      </div>
    </button>
  );
}
