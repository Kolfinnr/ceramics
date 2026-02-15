import { StoryblokBlock } from "@/lib/storyblok-types";

type FeaturedGridBlock = StoryblokBlock & {
  title?: string;
};

export default function FeaturedGrid({ blok }: { blok: FeaturedGridBlock }) {
  return (
    <section style={{ padding: "40px 0", borderBottom: "1px solid var(--line)" }}>
      <h2 className="brand-display" style={{ fontSize: 42, marginBottom: 12 }}>
        {blok.title ?? "Featured"}
      </h2>
      <p style={{ color: "#5f5147", margin: 0 }}>
        Curated pieces from our latest handmade collection will appear here.
      </p>
    </section>
  );
}
