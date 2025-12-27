import FeaturedGrid from "./FeaturedGrid";
import ContactCard from "./ContactCard";
import HomeHero from "./HomeHero";
import AboutHero from "./AboutHero";
import AboutStory from "./AboutStory";
import StorePage from "./StorePage";
import SiteLayout from "./SiteLayout";

type AnyBlock = Record<string, any>;

export default function BlockRenderer({ blok }: { blok: AnyBlock }) {
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



    default:
      return (
        <div style={{ padding: 16, border: "1px solid #ddd", margin: "16px 0" }}>
          <strong>Unknown block:</strong> {blok.component}
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(blok, null, 2)}
          </pre>
        </div>
      );
  }
}
