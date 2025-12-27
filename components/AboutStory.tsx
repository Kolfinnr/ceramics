import { render } from "storyblok-rich-text-react-renderer";

export default function AboutStory({ blok }: { blok: any }) {
  const img1 = blok.image1?.filename;
  const img2 = blok.image2?.filename;

  return (
    <section style={{ padding: "48px 0" }}>
      <div style={{ display: "grid", gap: 24 }}>
        {/* Rich text */}
        <div style={{ fontSize: 18, lineHeight: 1.7, color: "#222" }}>
          {blok.rich_text ? render(blok.rich_text) : <p>(No text yet)</p>}
        </div>

        {/* Images */}
        {(img1 || img2) && (
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {img1 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img1}
                alt={blok.image1?.alt || ""}
                style={{
                  width: "100%",
                  height: 320,
                  objectFit: "cover",
                  borderRadius: 14,
                  border: "1px solid #eee",
                }}
              />
            )}

            {img2 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img2}
                alt={blok.image2?.alt || ""}
                style={{
                  width: "100%",
                  height: 320,
                  objectFit: "cover",
                  borderRadius: 14,
                  border: "1px solid #eee",
                }}
              />
            )}
          </div>
        )}

        {/* Quote */}
        {blok.quote && (
          <blockquote
            style={{
              margin: 0,
              padding: "18px 18px",
              borderLeft: "4px solid #111",
              background: "#fafafa",
              borderRadius: 12,
              fontSize: 18,
              color: "#111",
            }}
          >
            “{blok.quote}”
          </blockquote>
        )}
      </div>
    </section>
  );
}
