import DynamicPage from "../[slug]/page";

export default function StoreIndex() {
  return <DynamicPage params={{ slug: "store" }} />;
}
