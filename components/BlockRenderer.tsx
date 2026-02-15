import AboutHero from "./AboutHero";
import AboutStory from "./AboutStory";
import ContactCard from "./ContactCard";
import FeaturedGrid from "./FeaturedGrid";
import HomeHero from "./HomeHero";
import LayeredPanel from "./LayeredPanel";
import LayeredStorySections from "./LayeredStorySections";
import SiteLayout from "./SiteLayout";
import StorePage from "./StorePage";
import { StoryblokBlock } from "@/lib/storyblok-types";

export default function BlockRenderer({ blok }: { blok: StoryblokBlock }) {
  switch (blok.component) {
    case "site_layout":
      return <SiteLayout blok={blok} />;

    case "featured_grid":
      return <FeaturedGrid blok={blok} />;

    case "contact_card":
      return <ContactCard blok={blok} />;

    case "home_hero":
      return <HomeHero blok={blok} />;

    case "about_hero":
      return <AboutHero blok={blok} />;

    case "about_story":
      return <AboutStory blok={blok} />;

    case "store_page":
      return <StorePage blok={blok} />;

    case "layered_story_section":
    case "layered_story_sections":
      return <LayeredStorySections blok={blok} />;

    case "layered_panel":
      return <LayeredPanel blok={blok} />;

    default:
      return (
        <div style={{ padding: 16, border: "1px solid #ddd", margin: "16px 0" }}>
          <strong>Unknown block:</strong> {blok.component}
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(blok, null, 2)}</pre>
        </div>
      );
  }
}
