import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "inpost-geowidget": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        onpoint?: string;
        token?: string;
        language?: string;
      };
    }
  }
}

declare global {
  interface Window {
    afterPointSelected?: (point: { id?: string; name?: string }) => void;
    onInpostPointSelected?: (point: {
      id?: string;
      name?: string;
      address?: string;
      postcode?: string;
      city?: string;
    }) => void;
  }
}
