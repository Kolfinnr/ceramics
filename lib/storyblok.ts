import { apiPlugin, storyblokInit } from "@storyblok/react/rsc";

storyblokInit({
  accessToken: process.env.STORYBLOK_TOKEN,
  use: [apiPlugin],
});

export {};
