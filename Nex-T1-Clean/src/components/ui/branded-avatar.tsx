"use client";

import { useMemo } from "react";

import {
  buildAvatarClipId,
  generateAvatarSpec,
  groupPathDataByStrokeWidth,
} from "@/lib/avatar/branded-avatar";
import { cn } from "@/lib/utils";

type BrandedAvatarProps = {
  seed: string;
  size?: number;
  rounded?: boolean;
  className?: string;
};

export function BrandedAvatar({
  seed,
  size = 32,
  rounded = true,
  className,
}: BrandedAvatarProps) {
  const spec = useMemo(() => generateAvatarSpec(seed), [seed]);
  const groupedPaths = useMemo(
    () => groupPathDataByStrokeWidth(spec.segments),
    [spec.segments],
  );
  const clipId = useMemo(() => buildAvatarClipId(spec), [spec]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block shrink-0", className)}
      aria-hidden="true"
    >
      {rounded ? (
        <defs>
          <clipPath id={clipId}>
            <circle cx="32" cy="32" r="32" />
          </clipPath>
        </defs>
      ) : null}
      <g clipPath={rounded ? `url(#${clipId})` : undefined}>
        <rect width="64" height="64" fill={spec.backgroundColor} />
        {groupedPaths.map(([strokeWidth, pathData]) => (
          <path
            key={`stroke-${strokeWidth}`}
            d={pathData}
            stroke={spec.overlayColor}
            strokeWidth={strokeWidth}
          />
        ))}
      </g>
    </svg>
  );
}
