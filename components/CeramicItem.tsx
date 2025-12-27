"use client";

import { useState } from "react";
import { render } from "storyblok-rich-text-react-renderer";
import { addToCart } from "@/lib/cart-storage";

export default function CeramicItem({
  story,
  isRedisSold = false,
}: {
  story: any;
  isRedisSold?: boolean;
}) {
  const c = story?.content ?? {};

  const title = c.name || story?.name || "Product";
  const priceRaw = c.price_pln;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number(priceRaw.replace(",", "."))
        : null;

  const photos = c.photos || [];
  const available = c.status !== false && !isRedisSold; // false = sold
  const categories = Array.isArray(c.category) ? c.category : [];

  const main = photos?.[0]?.filename;
  const rest = photos?.slice(1) ?? [];
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const rawSlug = story?.slug ?? story?.full_slug ?? title;
  const productSlug =
    typeof rawSlug === "string"
      ? rawSlug.split("/").filter(Boolean).pop() ?? rawSlug
      : title;

  const handleCheckout = async () => {
    if (!available || price == null || Number.isNaN(price)) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAddedMessage(null);

    try {
      const response = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productSlug,
              productName: title,
              pricePLN: price,
            },
          ],
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setErrorMessage(data.error ?? "Unable to start checkout.");
        setIsLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      setErrorMessage("Unable to start checkout.");
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!available || price == null || Number.isNaN(price)) return;
    addToCart({
      productSlug,
      productName: title,
      pricePLN: price,
      photo: main,
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
          {price != null && !Number.isNaN(price) && (
            <div style={{ fontSize: 18, color: "#333" }}>{price} PLN</div>
          )}

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
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* Gallery */}
        <section style={{ display: "grid", gap: 12 }}>
          {main && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={main}
              alt={photos?.[0]?.alt || ""}
              style={{
                width: "100%",
                height: 520,
                objectFit: "cover",
                borderRadius: 16,
                border: "1px solid #eee",
              }}
            />
          )}

          {rest.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {rest.map((p: any) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id || p.filename}
                  src={p.filename}
                  alt={p.alt || ""}
                  style={{
                    width: "100%",
                    height: 140,
                    objectFit: "cover",
                    borderRadius: 14,
                    border: "1px solid #eee",
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

          {/* Purchase actions */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eee" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <button
                disabled={!available || isLoading}
                onClick={handleCheckout}
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
                <a href="/cart" style={{ color: "#1a7f37" }}>
                  View cart
                </a>
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

      {/* Mobile fallback */}
      <style>{`
        @media (max-width: 900px) {
          main > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
