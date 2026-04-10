"use client";

import Image from "next/image";

import type { XpTierNumber } from "@/lib/xp/tier";
import { getBadgePathForTier } from "@/lib/xp/tier";
import { cn } from "@/lib/utils";

type XpTierIconProps = {
  tier: XpTierNumber;
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

export function XpTierIcon({
  tier,
  size = 18,
  className,
  priority = false,
  alt,
}: XpTierIconProps) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={getBadgePathForTier(tier)}
        alt={alt ?? `XP Tier ${tier} badge`}
        fill
        priority={priority}
        sizes={`${size}px`}
        className="object-contain"
      />
    </span>
  );
}

export default XpTierIcon;
