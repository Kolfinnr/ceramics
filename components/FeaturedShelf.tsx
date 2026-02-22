"use client";

import { useEffect, useMemo, useState } from "react";

type FeaturedShelfItem = {
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

export const computeFeaturedCardWidth = ({
  shelfHeight,
  ratio,
  isMobile,
}: {
  shelfHeight: number;
  ratio: number;
  isMobile: boolean;
}) => {
  const minWidth = isMobile ? 220 : 180;
  const maxWidth = isMobile ? 420 : 520;
  return Math.round(clamp(shelfHeight * ratio, minWidth, maxWidth));
};

export default function FeaturedShelf({
  items,
  onOpen,
}: {
  items: FeaturedShelfItem[];
  onOpen: (slug: string) => void;
}) {
  const [imageMetaBySlug, setImageMetaBySlug] = useState<Record<string, ImageMeta>>({});
  const [viewportWidth, setViewportWidth] = useState(1200);

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();

    let frame = 0;
    const onResize = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    window.addEventListener("resize", onResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const isMobile = viewportWidth < 900;
  const shelfHeight = isMobile ? 260 : 340;

  const cardWidths = useMemo(() => {
    const next: Record<string, number> = {};

    for (const item of items) {
      const parsed = parseDimensionsFromFilename(item.photo ?? undefined);
      const fallback = imageMetaBySlug[item.slug] ?? {};
      const width = parsed.width ?? fallback.width;
      const height = parsed.height ?? fallback.height;
      const ratio = width && height ? width / height : 1.2;
      next[item.slug] = computeFeaturedCardWidth({ shelfHeight, ratio, isMobile });
    }

    return next;
  }, [items, imageMetaBySlug, shelfHeight, isMobile]);

  return (
    <div
      style={{
        marginTop: 18,
        border: "1px solid #d9cbb8",
        borderRadius: 18,
        background: "#fff",
        padding: 12,
      }}
    >
      <div
        className="featured-shelf-track"
        style={{
          height: shelfHeight,
          display: "flex",
          alignItems: "stretch",
          gap: 16,
          overflowX: "auto",
          overflowY: "hidden",
          scrollBehavior: "smooth",
          paddingBottom: 2,
        }}
      >
        {items.map((item) => {
          const cardWidth = cardWidths[item.slug] ?? (isMobile ? 220 : 180);

          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => onOpen(item.slug)}
              style={{
                flex: "0 0 auto",
                width: cardWidth,
                height: shelfHeight,
                display: "flex",
                flexDirection: "column",
                textAlign: "left",
                color: "inherit",
                border: "1px solid #d9cbb8",
                borderRadius: 14,
                background: "#fff",
                padding: 10,
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  minHeight: 0,
                  flex: 1,
                  borderRadius: 10,
                  border: "1px solid #eadfce",
                  background: "#fff",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 10,
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

              <div style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
                <strong style={{ fontSize: 16, lineHeight: 1.25 }}>{item.name}</strong>
                {typeof item.price === "number" && <span>{item.price} PLN</span>}
                <span style={{ fontSize: 13, color: item.availableNow > 0 ? "#355a2f" : "#8c4d0f" }}>
                  {item.availableNow > 0
                    ? `${item.availableNow} ready now`
                    : "Made to order (2–3 weeks)"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        .featured-shelf-track::-webkit-scrollbar {
          height: 10px;
        }

        .featured-shelf-track::-webkit-scrollbar-thumb {
          background: #d9cbb8;
          border-radius: 999px;
        }

        .featured-shelf-track::-webkit-scrollbar-track {
          background: #f7f0e4;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
