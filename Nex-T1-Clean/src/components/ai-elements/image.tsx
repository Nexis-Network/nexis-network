/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

export type ImageProps = Partial<Experimental_GeneratedImage> & {
  className?: string;
  alt?: string;
  url?: string;
};

export const Image = ({
  base64,
  uint8Array: _uint8Array,
  mediaType,
  url,
  ...props
}: ImageProps) => {
  const resolvedSrc =
    url ??
    (base64 && mediaType ? `data:${mediaType};base64,${base64}` : undefined);

  if (!resolvedSrc) {
    return null;
  }

  return (
    <img
      {...props}
      alt={props.alt}
      className={cn("h-auto max-w-full overflow-hidden rounded-md", props.className)}
      src={resolvedSrc}
    />
  );
};
