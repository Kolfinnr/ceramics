export default function ContactCard({ blok }: { blok: any }) {
  return (
    <section style={{ padding: "24px 0", borderTop: "1px solid #eee" }}>
      <h3 style={{ fontSize: 20, marginBottom: 8 }}>Contact</h3>
      <div style={{ display: "grid", gap: 6 }}>
        {blok.email && <div><strong>Email:</strong> {blok.email}</div>}
        {blok.phone && <div><strong>Phone:</strong> {blok.phone}</div>}
      </div>
    </section>
  );
}
