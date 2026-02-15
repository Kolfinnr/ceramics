import Image from "next/image";
import Link from "next/link";
import { render } from "storyblok-rich-text-react-renderer";
import { storyblokEditable } from "@storyblok/react/rsc";
import type { SbBlokData } from "@storyblok/js";
import { StoryblokBlock, StoryblokImage, StoryblokLink } from "@/lib/storyblok-types";

type PanelAlignment = "left" | "center" | "right";

type LayeredPanelBlock = StoryblokBlock & {
  eyebrow?: string;
  headline?: string;
  body?: string | Record<string, unknown>;
  cta_label?: string;
  cta_link?: StoryblokLink | string;
  background_image?: StoryblokImage;
  alignment?: PanelAlignment;
  min_height?: "80vh" | "100vh";
  overlay_opacity?: number | string;
};

const resolveHref = (link?: StoryblokLink | string): string | null => {
  if (!link) return null;
  if (typeof link === "string") return link;

  if (typeof link.url === "string" && link.url.length > 0) return link.url;
  if (typeof link.cached_url === "string" && link.cached_url.length > 0) {
    return link.cached_url.startsWith("/") ? link.cached_url : `/${link.cached_url}`;
  }
  return null;
};

export default function LayeredPanel({ blok }: { blok: LayeredPanelBlock }) {
  const imageSrc = blok.background_image?.filename;
  const alignment = blok.alignment ?? "left";
  const minHeight = blok.min_height === "80vh" ? "80vh" : "100vh";
  const parsedOpacity = Number(blok.overlay_opacity ?? 0.35);
  const overlayOpacity = Number.isFinite(parsedOpacity)
    ? Math.max(0, Math.min(parsedOpacity, 0.8))
    : 0.35;
  const href = resolveHref(blok.cta_link);

  const textAlign =
    alignment === "center" ? "center" : alignment === "right" ? "right" : "left";

  const justifyContent =
    alignment === "center"
      ? "center"
      : alignment === "right"
        ? "flex-end"
        : "flex-start";

  return (
    <section
      {...storyblokEditable(blok as SbBlokData)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent,
        minHeight,
        padding: "clamp(16px, 5vw, 56px)",
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={blok.background_image?.alt || blok.headline || "Layered panel background"}
          fill
          priority={false}
          sizes="100vw"
          style={{ objectFit: "cover", zIndex: -3 }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(120deg, #534741 0%, #302824 100%)",
            zIndex: -3,
          }}
        />
      )}

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(19, 16, 14, ${Math.min(0.2, overlayOpacity)}) 0%, rgba(19, 16, 14, ${overlayOpacity}) 100%)`,
          zIndex: -2,
        }}
      />

      <article
        style={{
          width: "min(640px, 100%)",
          background: "rgba(248, 245, 241, 0.9)",
          backdropFilter: "blur(2px)",
          border: "1px solid rgba(67, 55, 49, 0.2)",
          borderRadius: 14,
          padding: "clamp(16px, 4vw, 40px)",
          color: "#1f1713",
          textAlign,
          boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
        }}
      >
        {blok.eyebrow && (
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
            {blok.eyebrow}
          </p>
        )}

        {blok.headline && (
          <h2 style={{ fontSize: "clamp(30px, 4.2vw, 58px)", lineHeight: 1.08, margin: "10px 0 14px" }}>
            {blok.headline}
          </h2>
        )}

        {typeof blok.body === "string" && <p style={{ fontSize: 18, lineHeight: 1.6 }}>{blok.body}</p>}
        {blok.body && typeof blok.body === "object" && (
          <div style={{ fontSize: 18, lineHeight: 1.6 }}>{render(blok.body)}</div>
        )}

        {href && blok.cta_label && (
          <div style={{ marginTop: 22 }}>
            <Link
              href={href}
              style={{
                display: "inline-block",
                padding: "11px 18px",
                borderRadius: 999,
                border: "1px solid #2f2621",
                color: "#2f2621",
                textDecoration: "none",
              }}
            >
              {blok.cta_label}
            </Link>
          </div>
        )}
      </article>
    </section>
  );
}
