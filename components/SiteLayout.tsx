import BlockRenderer from "./BlockRenderer";

export default function SiteLayout({ blok }: { blok: any }) {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      {(blok.content ?? []).map((nested: any) => (
        <BlockRenderer key={nested._uid} blok={nested} />
      ))}
    </main>
  );
}

