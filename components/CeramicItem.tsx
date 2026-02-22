"use client";

import { useState } from "react";
import Link from "next/link";
import { render } from "storyblok-rich-text-react-renderer";
import { addToCart } from "@/lib/cart-storage";
import { ProductContent, ProductStory, StoryblokImage } from "@/lib/storyblok-types";

export default function CeramicItem({
  story,
}: {
  story: ProductStory;
}) {
  const c = story?.content ?? ({} as ProductContent);

  const title = c.name || "Product";
  const priceRaw = c.price_pln;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number(priceRaw.replace(",", "."))
        : null;

  const photos = Array.isArray(c.photos) ? c.photos : [];
  // "status === false" means you manually disabled it in Storyblok.
// Redis sold should NOT block purchase anymore if you allow made-to-order.
  const available = c.status !== false;

  const categories = Array.isArray(c.category) ? c.category : [];
  const pcsRaw = c.pcs;
  const pcs = (() => {
    const n =
      typeof pcsRaw === "number"
        ? pcsRaw
        : typeof pcsRaw === "string"
          ? Number(pcsRaw)
          : 0;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  })();

  const [quantity, setQuantity] = useState<number>(1);

  // Backorder means customer wants more than ready stock
  const isBackorder = quantity > pcs;

  const MAX_QTY = 50; // soft safety cap so people don't accidentally type 5000

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const main = photos?.[selectedIndex]?.filename ?? photos?.[0]?.filename;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const rawSlug = story?.slug ?? story?.full_slug ?? title;
  const productSlug =
    typeof rawSlug === "string"
      ? rawSlug.split("/").filter(Boolean).pop() ?? rawSlug
      : title;

  const handleBuyNow = () => {
    if (!available || price == null || Number.isNaN(price)) return;
    addToCart({
      productSlug,
      productName: title,
      pricePLN: price,
      photo: main,
      quantity,
    });
    setIsLoading(true);
    window.location.assign("/cart?focus=delivery");
  };


  const handleAddToCart = () => {
    if (!available || price == null || Number.isNaN(price)) return;
    addToCart({
      productSlug,
      productName: title,
      pricePLN: price,
      photo: main,
      quantity,
    });
    setAddedMessage("Added to cart.");
    setErrorMessage(null);
  };

  return (
    <main style={{ padding: "32px 16px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
        <h1 style={{ fontSize: 42, margin: 0, lineHeight: 1.1 }}>{title}</h1>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {!available && (
            <div style={{ color: "#b00", fontWeight: 800 }}>Sold</div>
          )}
        </div>

        {categories.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {categories.map((cat: string) => (
              <span
                key={cat}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  border: "1px solid #ddd",
                  borderRadius: 999,
                  color: "#333",
                  background: "#fafafa",
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main layout: gallery + description */}
      <div
        className="ceramic-item-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* Gallery */}
        <section className="ceramic-item-gallery" style={{ display: "grid", gap: 12 }}>
          {main && (
            <div
              className="product-main-image"
              style={{
                width: "100%",
                borderRadius: 16,
                border: "1px solid #eee",
                background: "#fafafa",
                overflow: "hidden",
                minHeight: 280,
                maxHeight: "65vh",
              }}
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
              onMouseMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 100;
                const y = ((event.clientY - rect.top) / rect.height) * 100;
                setZoomOrigin(`${x}% ${y}%`);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={main}
                alt={photos?.[selectedIndex]?.alt || ""}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover",
                  transition: "transform 0.2s ease",
                  transform: zoomed ? "scale(1.4)" : "scale(1)",
                  transformOrigin: zoomOrigin,
                }}
              />
            </div>
          )}

          {photos.length > 1 && (
            <div
              className="ceramic-item-thumbs"
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
              }}
            >
              {photos.map((p: StoryblokImage, index: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id || p.filename}
                  src={p.filename}
                  alt={p.alt || ""}
                  onClick={() => setSelectedIndex(index)}
                  style={{
                    width: 110,
                    height: 110,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: index === selectedIndex ? "2px solid #111" : "1px solid #eee",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Description */}
        <aside
          style={{
            border: "1px solid #eee",
            borderRadius: 16,
            padding: 16,
            background: "#fff",
          }}
        >
          <h2 style={{ margin: 0, marginBottom: 10, fontSize: 18 }}>Details</h2>

          <div style={{ fontSize: 16, lineHeight: 1.7, color: "#222" }}>
            {c.description ? render(c.description) : <p>(No description yet.)</p>}
          </div>
          {/* Stock / quantity */}
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#444" }}>
              <span style={{ fontWeight: 700 }}>
                {pcs === 0 ? "Made to order" : "Available now"}
              </span>
              <span>·</span>
              <span>
                <strong>{pcs}</strong> pcs
              </span>
            </div>

            {price != null && !Number.isNaN(price) && (
              <div style={{ fontSize: 18, color: "#333" }}>{price} PLN</div>
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ fontWeight: 700, minWidth: 90 }}>Quantity</label>
              <input
                type="number"
                min={1}
                max={MAX_QTY}
                value={quantity}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value) || 1);
                  setQuantity(Math.max(1, Math.min(MAX_QTY, v)));
                }}
                style={{
                  width: 100,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                }}
              />
            </div>

            {isBackorder && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #f2c200",
                  background: "#fff9db",
                  color: "#5a4600",
                  fontWeight: 700,
                }}
              >
                You selected more than we currently have ready. The extra pieces may take{" "}
                <strong>2–3 business weeks</strong> to make.
              </div>
            )}
          </div>

          {/* Purchase actions */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <button
                disabled={!available || isLoading}
                onClick={handleBuyNow}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: available ? "#111" : "#ddd",
                  color: available ? "#fff" : "#666",
                  fontWeight: 700,
                  cursor: available ? "pointer" : "not-allowed",
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {available ? (isLoading ? "Redirecting..." : "Buy now") : "Sold"}
              </button>
              <button
                disabled={!available}
                onClick={handleAddToCart}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #111",
                  background: "transparent",
                  color: "#111",
                  fontWeight: 700,
                  cursor: available ? "pointer" : "not-allowed",
                }}
              >
                Add to cart
              </button>
            </div>
            {addedMessage && (
              <p style={{ marginTop: 10, color: "#1a7f37", fontWeight: 600 }}>
                {addedMessage}{" "}
                <Link href="/cart" style={{ color: "#1a7f37" }}>
                  View cart
                </Link>
              </p>
            )}
            {errorMessage && (
              <p style={{ marginTop: 10, color: "#b00", fontWeight: 600 }}>
                {errorMessage}
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Responsive popup fit */}
      <style>{`
        @media (max-width: 900px) {
          .ceramic-item-layout {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          .product-main-image {
            min-height: 220px !important;
            max-height: 45vh !important;
          }

          .ceramic-item-thumbs img {
            width: 84px !important;
            height: 84px !important;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          .product-main-image img {
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}


