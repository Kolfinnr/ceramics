import StoryblokClient from "storyblok-js-client";
import { notFound } from "next/navigation";
import CeramicItem from "../../../components/CeramicItem";
import { redis } from "@/lib/redis";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const token = process.env.STORYBLOK_TOKEN;
  if (!token) return <main style={{ padding: 40 }}>Missing STORYBLOK_TOKEN</main>;

  const sb = new StoryblokClient({ accessToken: token });

  try {
    const { data } = await sb.get(`cdn/stories/products/${slug}`, {
      version: "draft",
    });
    const redisStatus = await redis.get<string>(`status:product:${slug}`);
    const isRedisSold = redisStatus === "sold";

    return <CeramicItem story={data.story} isRedisSold={isRedisSold} />;
  } catch (e) {
    return notFound();
  }
}
