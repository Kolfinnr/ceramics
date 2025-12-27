import DynamicPage from "./[slug]/page";

export default function Home() {
  return <DynamicPage params={Promise.resolve({ slug: "home" })} />;
}
