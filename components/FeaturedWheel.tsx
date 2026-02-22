"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FeaturedWheelItem = {
  slug: string;
  name: string;
  price: number | null;
  photo: string | null;
  photoAlt: string;
  availableNow: number;
};

type ImageMeta = { width?: number; height?: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseDimensionsFromFilename = (filename?: string): ImageMeta => {
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

const computeCoverflowStyles = (normalizedDistance: number) => {
  const t = clamp(normalizedDistance, 0, 1);
  const scale = clamp(1 - t * 0.25, 0.75, 1);
  const alpha = clamp(1 - t * 0.65, 0.35, 1);
  const lift = Math.round(t * 12);
  const blur = t * 1.8;
  return { scale, alpha, lift, blur };
};

export default function FeaturedWheel({
  items,
  onOpen,
}: {
  items: FeaturedWheelItem[];
  onOpen: (slug: string) => void;
}) {
  const [imageMetaBySlug, setImageMetaBySlug] = useState<Record<string, ImageMeta>>({});
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [reducedMotion, setReducedMotion] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();

    let frame = 0;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateViewport);
    };

    window.addEventListener("resize", onResize);
    media.addEventListener("change", updateMotion);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      media.removeEventListener("change", updateMotion);
    };
  }, []);

  const isMobile = viewportWidth < 900;
  const cardHeight = isMobile ? 260 : 340;

  const cardSizes = useMemo(() => {
    const next: Record<string, number> = {};

    for (const item of items) {
      const parsed = parseDimensionsFromFilename(item.photo ?? undefined);
      const fallback = imageMetaBySlug[item.slug] ?? {};
      const width = parsed.width ?? fallback.width;
      const height = parsed.height ?? fallback.height;
      const ratio = width && height ? width / height : 1.2;

      const minWidth = isMobile ? 240 : 260;
      const maxWidth = isMobile ? 380 : 520;
      next[item.slug] = Math.round(clamp(cardHeight * ratio, minWidth, maxWidth));
    }

    return next;
  }, [items, imageMetaBySlug, cardHeight, isMobile]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;

    const updateTransforms = () => {
      frame = 0;
      if (reducedMotion) {
        cardRefs.current.forEach((card) => {
          card.style.setProperty("--scale", "1");
          card.style.setProperty("--alpha", "1");
          card.style.setProperty("--y", "0px");
          card.style.setProperty("--blur", "0px");
        });
        return;
      }

      const trackRect = track.getBoundingClientRect();
      const centerX = trackRect.left + trackRect.width / 2;
      const normalizer = Math.max(trackRect.width / 2, 1);

      cardRefs.current.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - centerX);
        const normalized = clamp(distance / normalizer, 0, 1);
        const { scale, alpha, lift, blur } = computeCoverflowStyles(normalized);

        card.style.setProperty("--scale", scale.toFixed(4));
        card.style.setProperty("--alpha", alpha.toFixed(4));
        card.style.setProperty("--y", `${lift}px`);
        card.style.setProperty("--blur", `${blur.toFixed(2)}px`);
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(updateTransforms);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      track.scrollLeft += event.deltaY;
      requestUpdate();
    };

    track.addEventListener("scroll", requestUpdate, { passive: true });
    track.addEventListener("wheel", onWheel, { passive: false });
    requestUpdate();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      track.removeEventListener("scroll", requestUpdate);
      track.removeEventListener("wheel", onWheel);
    };
  }, [items, cardSizes, reducedMotion]);

  return (
    <div
      style={{
        marginTop: 18,
        border: "1px solid #d9cbb8",
        borderRadius: 20,
        background: "#fff",
        padding: 14,
      }}
    >
      <div
        ref={trackRef}
        className="featured-wheel-track"
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 16,
          overflowX: "auto",
          overflowY: "hidden",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          padding: "2px 8px 10px",
        }}
      >
        <div style={{ flex: "0 0 max(8px, calc(50% - 240px))" }} aria-hidden />

        {items.map((item) => {
          const width = cardSizes[item.slug] ?? (isMobile ? 240 : 280);
          return (
            <button
              key={item.slug}
              ref={(node) => {
                if (node) {
                  cardRefs.current.set(item.slug, node);
                } else {
                  cardRefs.current.delete(item.slug);
                }
              }}
              type="button"
              onClick={() => onOpen(item.slug)}
              className="featured-wheel-card"
              style={{
                width,
                height: cardHeight,
                flex: "0 0 auto",
                scrollSnapAlign: "center",
                textAlign: "left",
                color: "inherit",
                border: "1px solid #d9cbb8",
                borderRadius: 16,
                background: "#fff",
                padding: 10,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                transform: "translateY(var(--y, 0px)) scale(var(--scale, 1))",
                opacity: "var(--alpha, 1)",
                filter: "blur(var(--blur, 0px))",
                transition: reducedMotion
                  ? "none"
                  : "transform 160ms ease, opacity 160ms ease, filter 160ms ease",
                transformOrigin: "center center",
                willChange: "transform, opacity, filter",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: 12,
                  border: "1px solid #eadfce",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  background: "#fff",
                }}
              >
                {item.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photo}
                    alt={item.photoAlt || item.name}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      if (!image.naturalWidth || !image.naturalHeight) return;

                      setImageMetaBySlug((current) => {
                        const existing = current[item.slug];
                        if (
                          existing?.width === image.naturalWidth &&
                          existing?.height === image.naturalHeight
                        ) {
                          return current;
                        }
                        return {
                          ...current,
                          [item.slug]: {
                            width: image.naturalWidth,
                            height: image.naturalHeight,
                          },
                        };
                      });
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                    }}
                  />
                ) : null}
              </div>

              <strong style={{ fontSize: 18, lineHeight: 1.2 }}>{item.name}</strong>
              {typeof item.price === "number" && <span>{item.price} PLN</span>}
              <span style={{ fontSize: 13, color: item.availableNow > 0 ? "#355a2f" : "#8c4d0f" }}>
                {item.availableNow > 0 ? `${item.availableNow} ready now` : "Made to order (2–3 weeks)"}
              </span>
            </button>
          );
        })}

        <div style={{ flex: "0 0 max(8px, calc(50% - 240px))" }} aria-hidden />
      </div>

      <style>{`
        .featured-wheel-track::-webkit-scrollbar {
          height: 10px;
        }

        .featured-wheel-track::-webkit-scrollbar-thumb {
          background: #d9cbb8;
          border-radius: 999px;
        }

        .featured-wheel-track::-webkit-scrollbar-track {
          background: #f7f0e4;
          border-radius: 999px;
        }

        @media (max-width: 900px) {
          .featured-wheel-card {
            scroll-snap-stop: always;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .featured-wheel-card {
            transform: none !important;
            opacity: 1 !important;
            filter: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
