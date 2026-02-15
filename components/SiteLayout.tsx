import { storyblokEditable } from "@storyblok/react/rsc";
import { StoryblokBlock } from "@/lib/storyblok-types";
import BlockRenderer from "./BlockRenderer";

type SiteLayoutBlock = StoryblokBlock & {
  content?: StoryblokBlock[];
};

export default function SiteLayout({ blok }: { blok: SiteLayoutBlock }) {
  return (
    <main
      {...storyblokEditable(blok)}
      style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}
    >
      {(blok.content ?? []).map((nested) => (
        <BlockRenderer key={nested._uid ?? nested.component} blok={nested} />
      ))}
    </main>
  );
}
