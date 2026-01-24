// lib/storyblok-management.ts
type StoryblokCreateStoryPayload = {
  story: {
    name: string;
    slug: string;
    parent_id: number;
    content: Record<string, unknown>;
    is_startpage?: boolean;
    default_root?: string;
  };
  publish?: number; // 1 to publish
};

async function sbMgmt<T>(path: string, init?: RequestInit): Promise<T> {
  const mgmtToken = process.env.STORYBLOK_MANAGEMENT_TOKEN;
  const spaceId = process.env.STORYBLOK_SPACE_ID;
  if (!mgmtToken || !spaceId) {
    throw new Error("Missing STORYBLOK_MANAGEMENT_TOKEN or STORYBLOK_SPACE_ID");
  }

  const res = await fetch(`https://mapi.storyblok.com/v1/spaces/${spaceId}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: mgmtToken,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Storyblok Mgmt API error: ${res.status} ${JSON.stringify(data)}`);
  return data as T;
}

type StoryblokStory = {
  id: number;
  name: string;
  slug: string;
  content: Record<string, unknown>;
};

type StoryblokStoryResponse = {
  story: StoryblokStory;
};

async function fetchStoryBySlug(slug: string): Promise<StoryblokStoryResponse> {
  const token = process.env.STORYBLOK_TOKEN?.trim();
  if (!token) {
    throw new Error("Missing STORYBLOK_TOKEN");
  }

  const url =
    `https://api.storyblok.com/v2/cdn/stories/products/${encodeURIComponent(slug)}` +
    `?version=published&token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Storyblok CDN error: ${res.status} ${raw}`);
  }

  return JSON.parse(raw) as StoryblokStoryResponse;
}

export async function updateProductStock(args: { slug: string; stock: number }) {
  const storyResponse = await fetchStoryBySlug(args.slug);
  const story = storyResponse.story;
  const content = {
    ...story.content,
    stock: args.stock,
  };

  return await sbMgmt<Record<string, unknown>>(`/stories/${story.id}`, {
    method: "PUT",
    body: JSON.stringify({
      story: {
        name: story.name,
        slug: story.slug,
        content,
      },
      publish: 0,
    }),
  });
}

export async function createOrderStory(args: {
  orderId: string;
  productSlug?: string;
  productSlugs?: string[];
  quantities?: Record<string, number>; // ✅ add
  status?: "paid" | "shipped" | "closed";
  customer: {
    name: string;
    email: string;
    phone: string;
    address1: string;
    postalCode: string;
    city: string;
    country: string;
  };
  delivery?: {
    method: "courier" | "inpost"; // ✅ add
    inpostPoint?: unknown; // ✅ add
  };
}) {
  const folderIdRaw = process.env.STORYBLOK_ORDERS_FOLDER_ID;
  if (!folderIdRaw) {
    throw new Error("Missing env STORYBLOK_ORDERS_FOLDER_ID");
  }

  const parent_id = Number(folderIdRaw);

  // slug inside the orders folder
  const slug = `orders/${args.orderId}`;

  const resolvedSlugs =
    args.productSlugs && args.productSlugs.length > 0
      ? args.productSlugs
      : args.productSlug
        ? [args.productSlug]
        : [];

  const payload: StoryblokCreateStoryPayload = {
    story: {
      name: args.orderId,
      slug,
      parent_id,
      content: {
        component: "order",
        order_id: args.orderId,
        product_slug: resolvedSlugs.join(", "),
        product_slugs: resolvedSlugs,
        status: args.status ?? "paid",

        // ✅ NEW: store quantities + delivery info
        quantities: args.quantities ?? {},
        delivery_method: args.delivery?.method ?? "courier",
        inpost_point: args.delivery?.inpostPoint ?? null,

        customer_name: args.customer.name,
        email: args.customer.email,
        phone: args.customer.phone,
        address_line1: args.customer.address1,
        postal_code: args.customer.postalCode,
        city: args.customer.city,
        country: args.customer.country,
      },
    },
    publish: 0,
  };

  return await sbMgmt<Record<string, unknown>>(`/stories/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


