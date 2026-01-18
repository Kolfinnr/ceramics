export type StoryblokBlock = {
  _uid?: string;
  component?: string;
  [key: string]: unknown;
};

export type StoryblokImage = {
  id?: string | number;
  filename?: string;
  alt?: string;
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
