import BlockRenderer from "./BlockRenderer";
import { StoryblokBlock } from "@/lib/storyblok-types";

type SiteLayoutBlock = StoryblokBlock & {
  content?: StoryblokBlock[];
};

export default function SiteLayout({ blok }: { blok: SiteLayoutBlock }) {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      {(blok.content ?? []).map((nested) => (
        <BlockRenderer key={nested._uid ?? nested.component} blok={nested} />
      ))}
    </main>
  );
}

