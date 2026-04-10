"use client";

import Image from "next/image";
import { BookIcon } from "lucide-react";
import {
  memo,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { getSourceIconDefinition } from "@/components/sources/source-icon-map";
import {
  getSourceDisplayName,
  getSourceFaviconUrl,
} from "@/components/sources/source-metadata";

type SourceIconProps = {
  title?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
};

export const SourceIcon = memo(function SourceIcon({
  title,
  url,
  size = 14,
  className,
}: SourceIconProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const icon = getSourceIconDefinition({ title, url });
  const fallbackFavicon = !icon && !faviconFailed ? getSourceFaviconUrl(url) : null;
  const containerSize = `${size}px`;
  const displayName = getSourceDisplayName({ title, url });

  useEffect(() => {
    setFaviconFailed(false);
  }, [title, url]);

  if (!icon) {
    if (fallbackFavicon) {
      return (
        <span
          className={cn("inline-flex shrink-0 items-center justify-center", className)}
          style={{ width: containerSize, height: containerSize }}
        >
          {/* Remote favicons are tiny, cross-domain fallbacks; Next/Image is reserved for local branded assets above. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="h-full w-full rounded-[4px] object-contain"
            decoding="async"
            height={size}
            loading="lazy"
            referrerPolicy="no-referrer"
            src={fallbackFavicon}
            width={size}
            onError={() => setFaviconFailed(true)}
          />
        </span>
      );
    }

    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
        style={{ width: containerSize, height: containerSize }}
      >
        <BookIcon className="size-[90%] text-muted-foreground" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: containerSize, height: containerSize }}
    >
      <Image
        src={icon.src}
        alt={`${displayName} logo`}
        width={size}
        height={size}
        sizes={`${size}px`}
        className="h-full w-full object-contain"
      />
    </span>
  );
});
