import type { SbBlokData, SbBlokKeyDataTypes } from "@storyblok/js";

export type StoryblokBlock = Omit<SbBlokData, "_uid" | "component"> & {
  _uid?: string;
  component?: string;
  [key: string]: SbBlokKeyDataTypes | undefined;
};

export type StoryblokImage = {
  id?: string | number;
  filename?: string;
  alt?: string;
};

export type StoryblokLink = {
  id?: string;
  linktype?: string;
  url?: string;
  cached_url?: string;
  story?: {
    full_slug?: string;
  };
  target?: string;
  anchor?: string;
};

export type StoryblokStory<
  TContent extends Record<string, unknown> = Record<string, unknown>,
> = {
  uuid?: string;
  slug?: string;
  full_slug?: string;
  name?: string;
  content?: TContent;
};

export type ProductContent = {
  name?: string;
  price_pln?: number | string;
  photos?: StoryblokImage[];
  status?: boolean;
  category?: string[];
  pcs?: number | string;
  description?: unknown;
};

export type ProductStory = StoryblokStory<ProductContent>;

export const isStoryblokBlock = (value: unknown): value is StoryblokBlock =>
  typeof value === "object" && value !== null && "component" in value;
