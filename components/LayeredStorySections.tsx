import { storyblokEditable } from "@storyblok/react/rsc";
import { StoryblokBlock } from "@/lib/storyblok-types";
import BlockRenderer from "./BlockRenderer";

type LayeredStorySectionsBlock = StoryblokBlock & {
  sections?: StoryblokBlock[];
};

export default function LayeredStorySections({
  blok,
}: {
  blok: LayeredStorySectionsBlock;
}) {
  return (
    <section
      {...storyblokEditable(blok)}
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      {(blok.sections ?? []).map((section) => (
        <BlockRenderer key={section._uid ?? section.component} blok={section} />
      ))}
    </section>
  );
}
