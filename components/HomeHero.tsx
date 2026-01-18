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
    <section style={{ padding: "48px 0", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "grid", gap: 16 }}>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>
          {blok.headline}
        </h1>

        {blok.subheadline && (
          <p style={{ fontSize: 18, color: "#444", margin: 0 }}>
            {blok.subheadline}
          </p>
        )}

        {blok.cta_href && blok.cta_label && (
          <a
            href={blok.cta_href}
            style={{
              display: "inline-block",
              padding: "12px 16px",
              border: "1px solid #000",
              width: "fit-content",
              textDecoration: "none",
              color: "black",
            }}
          >
            {blok.cta_label}
          </a>
        )}

        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={blok.hero_image?.alt || ""}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 12,
              border: "1px solid #eee",
            }}
          />
        )}
      </div>
    </section>
  );
}
