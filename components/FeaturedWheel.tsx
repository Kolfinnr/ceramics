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
  const blur = 0;
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
  const [currentIndex, setCurrentIndex] = useState(0);

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
  const mediaHeight = isMobile ? 220 : 300;
  const detailsHeight = isMobile ? 92 : 104;
  const cardHeight = mediaHeight + detailsHeight;

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
      next[item.slug] = Math.round(clamp(mediaHeight * ratio, minWidth, maxWidth));
    }

    return next;
  }, [items, imageMetaBySlug, mediaHeight, isMobile]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;

    const cards = items
      .map((item) => cardRefs.current.get(item.slug) ?? null)
      .filter((card): card is HTMLButtonElement => Boolean(card));

    const updateCenteredCard = () => {
      if (!cards.length) return;
      const trackRect = track.getBoundingClientRect();
      const centerX = trackRect.left + trackRect.width / 2;

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - centerX);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });

      setCurrentIndex(bestIndex);
    };

    const updateTransforms = () => {
      frame = 0;
      if (reducedMotion) {
        cardRefs.current.forEach((card) => {
          card.style.setProperty("--scale", "1");
          card.style.setProperty("--alpha", "1");
          card.style.setProperty("--y", "0px");
          card.style.setProperty("--blur", "0px");
        });
        updateCenteredCard();
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

      updateCenteredCard();
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = requestAnimationFrame(updateTransforms);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaX + event.deltaY;
      const maxLeft = track.scrollWidth - track.clientWidth;

      if (delta > 0 && track.scrollLeft >= maxLeft - 2) {
        scrollToIndex(0);
        requestUpdate();
        return;
      }

      if (delta < 0 && track.scrollLeft <= 2) {
        scrollToIndex(items.length - 1);
        requestUpdate();
        return;
      }

      track.scrollLeft += delta;
      requestUpdate();
    };

    track.addEventListener("scroll", requestUpdate, { passive: true });
    track.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      track.removeEventListener("scroll", requestUpdate);
      track.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [items, cardSizes, reducedMotion]);

  const scrollToIndex = (targetIndex: number) => {
    const track = trackRef.current;
    if (!track || !items.length) return;

    const bounded = ((targetIndex % items.length) + items.length) % items.length;
    const targetItem = items[bounded];
    const targetCard = cardRefs.current.get(targetItem.slug);
    if (!targetCard) return;

    targetCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const scrollByStep = (direction: -1 | 1) => {
    scrollToIndex(currentIndex + direction);
  };

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = window.setInterval(() => {
      scrollToIndex(currentIndex + 1);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [currentIndex, items.length]);

  return (
    <div className="featured-wheel-root" style={{ marginTop: 18, position: "relative" }}>
      <button
        type="button"
        aria-label="Scroll featured products left"
        onClick={(event) => {
          scrollByStep(-1);
          event.currentTarget.blur();
        }}
        className="featured-wheel-nav featured-wheel-nav--prev"
      >
        ‹
      </button>

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
          padding: "2px 2px 10px",
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
                border: "none",
                borderRadius: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                display: "grid",
                gridTemplateRows: `${mediaHeight}px ${detailsHeight}px`,
                transform: "translateY(var(--y, 0px)) scale(var(--scale, 1))",
                opacity: "var(--alpha, 1)",
                filter: "blur(var(--blur, 0px))",
                transition: reducedMotion
                  ? "none"
                  : "transform 160ms ease, opacity 160ms ease, filter 160ms ease",
                transformOrigin: "center center",
                willChange: "transform, opacity, filter",
                overflow: "visible",
              }}
            >
              <div
                style={{
                  height: mediaHeight,
                  borderRadius: 0,
                  border: "none",
                  overflow: "visible",
                  display: "grid",
                  placeItems: "center",
                  background: "transparent",
                  padding: 8,
                  boxSizing: "border-box",
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
                      objectPosition: "center center",
                      display: "block",
                    }}
                  />
                ) : null}
              </div>

              <div
                style={{
                  height: detailsHeight,
                  display: "grid",
                  alignContent: "start",
                  gap: 4,
                  paddingInline: 4,
                  overflow: "hidden",
                }}
              >
                <strong
                  style={{
                    fontSize: 18,
                    lineHeight: 1.2,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.name}
                </strong>
                {typeof item.price === "number" && <span>{item.price} PLN</span>}
                <span style={{ fontSize: 13, color: item.availableNow > 0 ? "#355a2f" : "#8c4d0f" }}>
                  {item.availableNow > 0 ? `${item.availableNow} ready now` : "Made to order (2–3 weeks)"}
                </span>
              </div>
            </button>
          );
        })}

        <div style={{ flex: "0 0 max(8px, calc(50% - 240px))" }} aria-hidden />
      </div>

      <button
        type="button"
        aria-label="Scroll featured products right"
        onClick={(event) => {
          scrollByStep(1);
          event.currentTarget.blur();
        }}
        className="featured-wheel-nav featured-wheel-nav--next"
      >
        ›
      </button>

      <style>{`
        .featured-wheel-track {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .featured-wheel-track::-webkit-scrollbar {
          display: none;
        }

        .featured-wheel-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 1px solid #d9cbb8;
          background: rgba(255,255,255,0.92);
          color: #2b2620;
          font-size: 28px;
          line-height: 1;
          display: inline-grid;
          place-items: center;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease;
        }

        .featured-wheel-root:hover .featured-wheel-nav,
        .featured-wheel-root:focus-within .featured-wheel-nav,
        .featured-wheel-nav:focus-visible {
          opacity: 1;
          pointer-events: auto;
        }


        .featured-wheel-nav--prev {
          left: 6px;
        }

        .featured-wheel-nav--next {
          right: 6px;
        }

        @media (max-width: 900px) {
          .featured-wheel-card {
            scroll-snap-stop: always;
          }

          .featured-wheel-nav {
            width: 34px;
            height: 34px;
            font-size: 24px;
          }
        }

        @media (hover: none) and (pointer: coarse) {
          .featured-wheel-nav {
            opacity: 1;
            pointer-events: auto;
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
