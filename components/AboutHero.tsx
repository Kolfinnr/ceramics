export default function AboutHero({ blok }: { blok: any }) {
  const img = blok.image?.filename || blok.hero_image?.filename; // supports either name

  return (
    <section style={{ padding: "56px 0", borderBottom: "1px solid #eee" }}>
      <div style={{ display: "grid", gap: 14 }}>
        <h1 style={{ fontSize: 40, margin: 0 }}>
          {blok.headline || blok.title || "About"}
        </h1>

        {blok.subheadline && (
          <p style={{ fontSize: 18, color: "#444", margin: 0 }}>
            {blok.subheadline}
          </p>
        )}

        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={blok.image?.alt || blok.hero_image?.alt || ""}
            style={{
              width: "100%",
              maxWidth: 720,
              borderRadius: 14,
              border: "1px solid #eee",
            }}
          />
        )}
      </div>
    </section>
  );
}
