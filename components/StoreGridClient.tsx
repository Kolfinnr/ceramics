"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";
import CeramicItem from "./CeramicItem";
import { ProductStory } from "@/lib/storyblok-types";

type CardVariant = "default" | "tall" | "wide";
type ActiveImageMeta = { width?: number; height?: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function computeModalFromImage({
  vw,
  vh,
  imgW,
  imgH,
  detailsW = 420,
  gap = 24,
  pad = 24,
  headerExtra = 320,
}: {
  vw: number;
  vh: number;
  imgW?: number;
  imgH?: number;
  detailsW?: number;
  gap?: number;
  pad?: number;
  headerExtra?: number;
}) {
  const ratio = imgW && imgH ? imgW / imgH : 1.3;
  const isMobile = vw < 900;
  const maxModalW = Math.min(vw * 0.92, 1200);
  const maxModalH = Math.min(vh * 0.96, 980);

  if (isMobile) {
    const modalW = maxModalW;
    const maxMediaW = modalW - pad * 2;
    const mediaH0 = clamp(vh * 0.55, 320, 520);
    let mediaW = mediaH0 * ratio;
    if (mediaW > maxMediaW) mediaW = maxMediaW;
    const mediaH = clamp(mediaW / ratio, 320, 620);
    const modalH = clamp(mediaH + 340, 600, maxModalH);
    return { modalW, modalH, mediaH, isMobile: true };
  }

  const minModalW = Math.min(760, maxModalW);
  const minModalH = Math.min(640, maxModalH);
  const maxMediaW = maxModalW - (detailsW + gap + pad * 2);

  let mediaH = clamp(vh * 0.72, 420, 760);
  let mediaW = mediaH * ratio;
  if (mediaW > maxMediaW) {
    mediaW = Math.max(260, maxMediaW);
    mediaH = clamp(mediaW / ratio, 420, 760);
  }

  const modalW = clamp(detailsW + gap + mediaW + pad * 2, minModalW, maxModalW);
  const modalH = clamp(Math.max(mediaH + headerExtra, minModalH), minModalH, maxModalH);
  return { modalW, modalH, mediaH, isMobile: false };
}

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

const parseDimensionsFromFilename = (filename?: string): ActiveImageMeta => {
  if (!filename) return {};
  const match = filename.match(/\/(\d+)x(\d+)\//);
  if (!match) return {};

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {};
  }

  return { width, height };
};

const resolveLargestImageMeta = (story: ProductStory | null): ActiveImageMeta => {
  const photos = Array.isArray(story?.content?.photos) ? story?.content?.photos : [];
  let winner: ActiveImageMeta = {};
  let winnerArea = 0;

  photos.forEach((photo) => {
    const parsed = parseDimensionsFromFilename(photo?.filename);
    if (!parsed.width || !parsed.height) return;

    const area = parsed.width * parsed.height;
    if (area > winnerArea) {
      winner = parsed;
      winnerArea = area;
    }
  });

  return winner;
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
  const [activeImageMeta, setActiveImageMeta] = useState<ActiveImageMeta>({});
  const [largestImageMeta, setLargestImageMeta] = useState<ActiveImageMeta>({});
  const [mediaStageHeight, setMediaStageHeight] = useState<number | undefined>(undefined);
  const [isMobileModal, setIsMobileModal] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

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
    setActiveImageMeta({});
    setLargestImageMeta({});
    setMediaStageHeight(undefined);
    setIsMobileModal(false);

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
      const nextStory = json.story ?? null;
      setOpenStory(nextStory);
      setLargestImageMeta(resolveLargestImageMeta(nextStory));
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

  useEffect(() => {
    if (!openSlug) return;

    const updateModalSize = () => {
      const modal = modalRef.current;
      if (!modal) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { modalW, modalH, mediaH, isMobile } = computeModalFromImage({
        vw,
        vh,
        imgW: largestImageMeta.width ?? activeImageMeta.width,
        imgH: largestImageMeta.height ?? activeImageMeta.height,
      });

      modal.style.width = `${Math.round(modalW)}px`;
      modal.style.height = `${Math.round(modalH)}px`;
      setMediaStageHeight(Math.round(mediaH));
      setIsMobileModal(isMobile);
    };

    updateModalSize();
    window.requestAnimationFrame(updateModalSize);

    const onResize = () => updateModalSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [openSlug, activeImageMeta, largestImageMeta]);

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
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 1100px)",
              height: "min(96vh, 980px)",
              maxWidth: "92vw",
              maxHeight: "96vh",
              background: "rgba(255, 255, 255, 0.55)",
              borderRadius: 16,
              border: "1px solid #d9cbb8",
              boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              transition: "width 180ms ease, height 180ms ease",
              willChange: "width, height",
            }}
          >
            <button
              onClick={closeModal}
              aria-label="Close product details"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              Close
            </button>

            <div style={{ overflowY: "auto", paddingTop: 8 }}>
              {loadingStory && <div style={{ padding: 16 }}>Loading…</div>}

              {storyError && (
                <div style={{ padding: 16, color: "#b00" }}>
                  Failed to load product.<pre style={{ whiteSpace: "pre-wrap" }}>{storyError}</pre>
                </div>
              )}

              {openStory && <CeramicItem
                  story={openStory}
                  onActiveImageMetaChange={setActiveImageMeta}
                  mediaStageHeight={mediaStageHeight}
                  forceMobileLayout={isMobileModal}
                />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
