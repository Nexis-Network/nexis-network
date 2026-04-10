"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type NativeChainLogoProps = {
  src: string;
  alt: string;
  className?: string;
};

export function NativeChainLogo({ src, alt, className }: NativeChainLogoProps) {
  return (
    <span
      className={cn(
        "relative flex h-3 w-3 shrink-0 rounded-md bg-white/10 ring-1 ring-black/5 backdrop-blur dark:bg-white/10 dark:ring-white/10",
        className,
      )}
    >
      <Image src={src} alt={alt} fill sizes="12px" className="object-cover" />
    </span>
  );
}
