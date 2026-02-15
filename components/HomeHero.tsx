import { StoryblokBlock, StoryblokImage } from "@/lib/storyblok-types";

type HomeHeroBlock = StoryblokBlock & {
  headline?: string;
  subheadline?: string;
  cta_href?: string;
  cta_label?: string;
  hero_image?: StoryblokImage;
};

export default function HomeHero({ blok }: { blok: HomeHeroBlock }) {
  const img = blok.hero_image?.filename;

  return (
    <section style={{ padding: "52px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "grid", gap: 20 }}>
        <h1 className="brand-heading" style={{ margin: 0 }}>
          {blok.headline}
        </h1>

        {blok.subheadline && (
          <p style={{ fontSize: 34, color: "#3d3027", margin: 0, lineHeight: 1.15 }}>
            {blok.subheadline}
          </p>
        )}

        {blok.cta_href && blok.cta_label && (
          <a
            href={blok.cta_href}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              border: "1px solid #30261f",
              width: "fit-content",
              textDecoration: "none",
              color: "#1f1712",
              background: "#fff9f3",
            }}
          >
            {blok.cta_label}
          </a>
        )}

        {img && (
          <div className="hero-image-stack">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img}
              alt={blok.hero_image?.alt || ""}
              style={{
                width: "100%",
                maxWidth: 560,
                borderRadius: 12,
                border: "1px solid #d8c7b9",
                position: "relative",
                zIndex: 2,
              }}
            />
            <div className="hero-image-backdrop" aria-hidden="true" />
          </div>
        )}
      </div>
    </section>
  );
}
