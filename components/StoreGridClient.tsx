"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import CeramicItem from "./CeramicItem";
import { ProductStory } from "@/lib/storyblok-types";

type CardVariant = "default" | "tall" | "wide";

const parseRatioFromFilename = (filename?: string): number | null => {
  if (!filename) return null;
  const match = filename.match(/\/(\d+)x(\d+)\//);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return width / height;
};

const resolveCardVariant = (product: ProductStory): CardVariant => {
  const rawType = (product?.content as { type?: unknown } | undefined)?.type;
  const normalized = typeof rawType === "string" ? rawType.trim().toLowerCase() : "";

  if (normalized === "default" || normalized === "tall" || normalized === "wide") {
    return normalized;
  }

  const firstPhoto = (product?.content as { photos?: Array<{ filename?: string }> } | undefined)?.photos?.[0];
  const ratio = parseRatioFromFilename(firstPhoto?.filename);

  if (typeof ratio === "number") {
    if (ratio < 0.7) return "tall";
    if (ratio > 1.35) return "wide";
  }

  return "default";
};

export default function StoreGridClient({ products }: { products: ProductStory[] }) {
  const [showSold, setShowSold] = useState(false);
  const [category, setCategory] = useState<string>("all");

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialItemSlug = searchParams.get("item");

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

    if (searchParams.has("item")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("item");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
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

  useEffect(() => {
    if (!initialItemSlug) return;
    if (openSlug === initialItemSlug || loadingStory) return;

    const exists = products.some((p) => p.slug === initialItemSlug);
    if (!exists) return;

    void openModal(initialItemSlug);
  }, [initialItemSlug, openSlug, loadingStory, products]);

  return (
    <div style={{ marginTop: 18 }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
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
          <span>Show sold</span>
        </label>

        <div style={{ marginLeft: "auto", color: "#555" }}>
          Showing <strong>{filtered.length}</strong> item(s)
        </div>
      </div>

      {/* Grid */}
      <div
        className="store-grid-collage"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridAutoRows: 220,
          gridAutoFlow: "dense",
          gap: 16,
        }}
      >
        {filtered.map((p) => (
          <ProductCard
            key={p.uuid ?? p.slug}
            product={p}
            onOpen={openModal}
            variant={resolveCardVariant(p)}
          />
        ))}
      </div>

      <style>{`
        .store-card--default {
          grid-column: span 1;
          grid-row: span 1;
        }

        .store-card--tall {
          grid-column: span 1;
          grid-row: span 2;
        }

        .store-card--wide {
          grid-column: span 2;
          grid-row: span 1;
        }

        @media (max-width: 1100px) {
          .store-grid-collage {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .store-card--wide {
            grid-column: span 2;
          }
        }

        @media (max-width: 900px) {
          .store-grid-collage {
            grid-template-columns: 1fr !important;
            grid-auto-rows: auto !important;
          }

          .store-card--default,
          .store-card--tall,
          .store-card--wide {
            grid-column: span 1 !important;
            grid-row: span 1 !important;
            min-height: 320px !important;
          }
        }
      `}</style>

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
              background: "#fff",
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
                background: "#fff",
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
                  background: "#fff",
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
