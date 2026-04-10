"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type GlassMaskImageProps = {
  src: string;
  alt: string;
  size?: number;
  className?: string;
};

/**
 * Renders an image with the liquid-glass mask overlay applied via CSS mask-image.
 * Use for chain logos, user avatars, and token icons to maintain a unified
 * frosted-glass aesthetic across the app.
 */
export function GlassMaskImage({
  src,
  alt,
  size = 20,
  className,
}: GlassMaskImageProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: "url(/assets/glass-mask.png)",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskImage: "url(/assets/glass-mask.png)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
    </span>
  );
}
