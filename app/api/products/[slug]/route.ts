import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing STORYBLOK_TOKEN" }, { status: 500 });
    }

  const url =
    `https://api.storyblok.com/v2/cdn/stories/products/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();

  if (!res.ok) {
    return NextResponse.json({ error: raw }, { status: res.status });
  }

  const data = JSON.parse(raw);
  return NextResponse.json({ story: data.story });
}
