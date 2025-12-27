export default function ProductCard({ product }: { product: any }) {
  const { slug, content } = product;

  const title = content?.name || product?.name || "Product";
  const price = content?.price_pln;
  const photos = content?.photos || [];
  const img = photos?.[0]?.filename;

  // status: true = available, false = sold
  const available = content?.status !== false;

  return (
    <a
      href={`/store/${slug}`}
      style={{
        display: "block",
        border: "1px solid #eee",
        borderRadius: 14,
        padding: 12,
        textDecoration: "none",
        color: "inherit",
        opacity: available ? 1 : 0.7,
      }}
    >
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={photos?.[0]?.alt || ""}
          style={{
            width: "100%",
            height: 260,
            objectFit: "cover",
            borderRadius: 12,
            border: "1px solid #eee",
          }}
        />
      )}

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>

        {typeof price === "number" && (
          <div style={{ color: "#444" }}>{price} PLN</div>
        )}

        {!available && (
          <div style={{ color: "#b00", fontWeight: 800 }}>Sold</div>
        )}
      </div>
    </a>
  );
}
