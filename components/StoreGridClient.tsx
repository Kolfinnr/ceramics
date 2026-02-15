"use client";

import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import CeramicItem from "./CeramicItem";
import { ProductStory } from "@/lib/storyblok-types";

export default function StoreGridClient({ products }: { products: ProductStory[] }) {
  const [showSold, setShowSold] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [openStory, setOpenStory] = useState<ProductStory | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const cats = p?.content?.category;
      if (Array.isArray(cats)) cats.forEach((c: string) => set.add(c));
    }
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const available = p?.content?.status !== false;
      const cats = Array.isArray(p?.content?.category) ? p.content.category : [];

      if (!showSold && !available) return false;
      if (category !== "all" && !cats.includes(category)) return false;

      return true;
    });
  }, [products, showSold, category]);

  const closeModal = () => {
    setOpenSlug(null);
    setOpenStory(null);
    setStoryError(null);
    setLoadingStory(false);
  };

  const openModal = async (slug: string) => {
    setOpenSlug(slug);
    setOpenStory(null);
    setStoryError(null);
    setLoadingStory(true);

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
      const raw = await res.text();

      if (!res.ok) {
        setStoryError(raw);
        setLoadingStory(false);
        return;
      }

      const json = JSON.parse(raw);
      setOpenStory(json.story ?? null);
      setLoadingStory(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setStoryError(message);
      setLoadingStory(false);
    }
  };

  return (
    <div style={{ marginTop: 22 }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 20,
          border: "1px solid var(--line)",
          padding: 14,
          borderRadius: 16,
          background: "#fffaf7",
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid #ccb7a6", background: "#fff" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={showSold}
            onChange={(e) => setShowSold(e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>Show sold</span>
        </label>

        <div className="brand-script" style={{ marginLeft: "auto", color: "#6e5b4b", fontSize: 22 }}>
          Showing <strong>{filtered.length}</strong> item(s)
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {filtered.map((p) => (
          <ProductCard key={p.uuid ?? p.slug} product={p} onOpen={openModal} />
        ))}
      </div>

      {/* Modal */}
      {openSlug && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(1100px, 100%)",
              maxHeight: "90vh",
              background: "var(--card)",
              borderRadius: 16,
              border: "1px solid #eee",
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                borderBottom: "1px solid #eee",
                position: "sticky",
                top: 0,
                background: "var(--card)",
                zIndex: 1,
              }}
            >
              <strong style={{ paddingLeft: 4 }}>
                {openStory?.name ?? `Item: ${openSlug}`}
              </strong>
              <button
                onClick={closeModal}
                style={{
                  border: "1px solid #ddd",
                  background: "var(--card)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ overflowY: "auto" }}>
              {loadingStory && <div style={{ padding: 16 }}>Loading…</div>}

              {storyError && (
                <div style={{ padding: 16, color: "#b00" }}>
                  Failed to load product.<pre style={{ whiteSpace: "pre-wrap" }}>{storyError}</pre>
                </div>
              )}

              {openStory && <CeramicItem story={openStory} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
