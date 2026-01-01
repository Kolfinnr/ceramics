import DynamicPage from "../[slug]/page";
export const dynamic = "force-dynamic";

export default function StoreIndex() {
  return <DynamicPage params={{ slug: "store" }} />;
}
