export default function FeaturedGrid({ blok }: { blok: any }) {
  return (
    <section style={{ padding: "40px 0" }}>
      <h2 style={{ fontSize: 28, marginBottom: 12 }}>{blok.title ?? "Featured"}</h2>
      <p style={{ color: "#555" }}>
        (This is a placeholder design. We’ll style it later.)
      </p>
    </section>
  );
}
