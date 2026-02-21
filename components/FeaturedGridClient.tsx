"use client";

import { useState } from "react";
import CeramicItem from "./CeramicItem";
import { ProductStory } from "@/lib/storyblok-types";

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

      const json = JSON.parse(raw) as { story?: ProductStory };
      setOpenStory(json.story ?? null);
      setLoadingStory(false);
    } catch (error: unknown) {
      setStoryError(error instanceof Error ? error.message : String(error));
      setLoadingStory(false);
    }
  };

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
            onClick={(event) => event.stopPropagation()}
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
              <strong style={{ paddingLeft: 4 }}>{openStory?.name ?? `Item: ${openSlug}`}</strong>
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
                  Failed to load product.
                  <pre style={{ whiteSpace: "pre-wrap" }}>{storyError}</pre>
                </div>
              )}

              {openStory && <CeramicItem story={openStory} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
