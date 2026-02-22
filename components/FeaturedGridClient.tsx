"use client";

import { useEffect, useRef, useState } from "react";
import CeramicItem from "./CeramicItem";
import { ProductStory } from "@/lib/storyblok-types";

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

type FeaturedCardItem = {
  slug: string;
  name: string;
  price: number | null;
  photo: string | null;
  photoAlt: string;
  availableNow: number;
};

export default function FeaturedGridClient({ items }: { items: FeaturedCardItem[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [openStory, setOpenStory] = useState<ProductStory | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [activeImageMeta, setActiveImageMeta] = useState<ActiveImageMeta>({});
  const [mediaStageHeight, setMediaStageHeight] = useState<number | undefined>(undefined);
  const [isMobileModal, setIsMobileModal] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const closeModal = () => {
    setOpenSlug(null);
    setOpenStory(null);
    setStoryError(null);
    setLoadingStory(false);
    setActiveImageMeta({});
    setMediaStageHeight(undefined);
    setIsMobileModal(false);
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

      const json = JSON.parse(raw) as { story?: ProductStory };
      setOpenStory(json.story ?? null);
      setLoadingStory(false);
    } catch (error: unknown) {
      setStoryError(error instanceof Error ? error.message : String(error));
      setLoadingStory(false);
    }
  };

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
        imgW: activeImageMeta.width,
        imgH: activeImageMeta.height,
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
  }, [openSlug, activeImageMeta]);

  return (
    <>
      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => void openModal(item.slug)}
            style={{
              display: "grid",
              gap: 8,
              textAlign: "left",
              color: "inherit",
              border: "1px solid #d9cbb8",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.55)",
              padding: 10,
              cursor: "pointer",
            }}
          >
            {item.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.photo}
                alt={item.photoAlt || item.name}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 10,
                  border: "1px solid #eadfce",
                }}
              />
            )}
            <strong style={{ fontSize: 18 }}>{item.name}</strong>
            {typeof item.price === "number" && <span>{item.price} PLN</span>}
            <span style={{ fontSize: 13, color: item.availableNow > 0 ? "#355a2f" : "#8c4d0f" }}>
              {item.availableNow > 0
                ? `${item.availableNow} ready now`
                : "Made to order (2–3 weeks)"}
            </span>
          </button>
        ))}
      </div>

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
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(92vw, 1100px)",
              height: "min(96vh, 980px)",
              maxWidth: "92vw",
              maxHeight: "96vh",
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #eee",
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
                  Failed to load product.
                  <pre style={{ whiteSpace: "pre-wrap" }}>{storyError}</pre>
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
    </>
  );
}
