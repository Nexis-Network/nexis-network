"use client";

import React from "react";

import { cn } from "@/lib/utils";

export type ProgressiveBlurDirection = "left" | "right" | "top" | "bottom";

export type ProgressiveBlurProps = {
  className?: string;
  direction: ProgressiveBlurDirection;
  blurIntensity?: number;
};

const getMask = (direction: ProgressiveBlurDirection) => {
  switch (direction) {
    case "left":
      return "linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))";
    case "right":
      return "linear-gradient(to left, rgba(0,0,0,1), rgba(0,0,0,0))";
    case "top":
      return "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))";
    case "bottom":
      return "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))";
  }
};

export function ProgressiveBlur({ className, direction, blurIntensity = 1 }: ProgressiveBlurProps) {
  const blurPx = `${Math.max(0, blurIntensity) * 4}px`;
  const mask = getMask(direction);

  return (
    <div
      aria-hidden
      className={cn("select-none", className)}
      style={{
        WebkitBackdropFilter: `blur(${blurPx})`,
        backdropFilter: `blur(${blurPx})`,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}

