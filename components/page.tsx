import DynamicPage from "./[slug]/page";

export default function Home() {
  return <DynamicPage params={{ slug: "home" }} />;
}
