import DynamicPage from "../[slug]/page";

export default function AboutPage() {
  return <DynamicPage params={{ slug: "about" }} />;
}
