"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const masonryConfig = useRef({ rowHeight: 8, gap: 16 });

  const measureRowSpan = useCallback((item: HTMLDivElement) => {
    const { rowHeight, gap } = masonryConfig.current;
    item.style.gridRowEnd = "auto";

    const card = item.firstElementChild as HTMLElement | null;
    const measuredHeight = Math.max(
      item.getBoundingClientRect().height,
      item.scrollHeight,
      card?.getBoundingClientRect().height ?? 0,
      card?.scrollHeight ?? 0,
    );

    const rowSpan = Math.ceil((measuredHeight + gap) / (rowHeight + gap));
    item.style.gridRowEnd = `span ${Math.max(rowSpan, 1)}`;
  }, []);

  const setCardRef = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current.set(key, node);
      window.requestAnimationFrame(() => measureRowSpan(node));
      return;
    }
    cardRefs.current.delete(key);
  }, [measureRowSpan]);

  const applyMasonryLayout = useCallback(() => {
    cardRefs.current.forEach((item) => measureRowSpan(item));
  }, [measureRowSpan]);

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

  useEffect(() => {
    const runLayout = () => window.requestAnimationFrame(() => window.requestAnimationFrame(applyMasonryLayout));
    const cleanupFns: Array<() => void> = [];

    const observer = new ResizeObserver(() => runLayout());

    cardRefs.current.forEach((item) => {
      observer.observe(item);

      const images = Array.from(item.querySelectorAll("img"));
      images.forEach((image) => {
        if (image.complete) return;
        const onDone = () => runLayout();
        image.addEventListener("load", onDone);
        image.addEventListener("error", onDone);
        cleanupFns.push(() => {
          image.removeEventListener("load", onDone);
          image.removeEventListener("error", onDone);
        });
      });
    });

    window.addEventListener("resize", runLayout);
    runLayout();

    return () => {
      cleanupFns.forEach((fn) => fn());
      window.removeEventListener("resize", runLayout);
      observer.disconnect();
    };
  }, [applyMasonryLayout, filtered]);

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
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: 8,
          gridAutoFlow: "dense",
          gap: 16,
        }}
      >
        {filtered.map((p, idx) => {
          const key = p.uuid ?? p.slug ?? `idx-${idx}`;
          const variant = resolveCardVariant(p);
          const isLarge = variant === "wide";

          return (
            <div
              key={key}
              ref={(node) => setCardRef(key, node)}
              className={`store-masonry-item ${isLarge ? "store-masonry-item--large" : ""}`}
            >
              <ProductCard product={p} onOpen={openModal} variant={variant} />
            </div>
          );
        })}
      </div>

      <style>{`
        .store-masonry-item {
          grid-column: span 4;
          grid-row-end: span 1;
          overflow: hidden;
          border-radius: 14px;
        }

        .store-masonry-item--large {
          grid-column: span 8;
        }

        @media (max-width: 1100px) {
          .store-masonry-item {
            grid-column: span 6;
          }

          .store-masonry-item--large {
            grid-column: span 12;
          }
        }

        @media (max-width: 900px) {
          .store-grid-collage {
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
          }

          .store-masonry-item,
          .store-masonry-item--large {
            grid-column: span 12 !important;
            grid-row-end: span 1 !important;
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
