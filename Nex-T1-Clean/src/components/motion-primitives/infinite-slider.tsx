"use client";

import React from "react";

import { cn } from "@/lib/utils";

export type InfiniteSliderProps = {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  speedOnHover?: number;
  gap?: number;
  reverse?: boolean;
};

const toSeconds = (value: number) => `${Math.max(value, 0)}s`;
const toPixels = (value: number) => `${Math.max(value, 0)}px`;

export function InfiniteSlider({
  children,
  className,
  speed = 40,
  speedOnHover,
  gap = 24,
  reverse = false,
}: InfiniteSliderProps) {
  const items = React.Children.toArray(children);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("infinite-slider relative overflow-hidden", className)}
      style={
        {
          ["--infinite-slider-duration" as string]: toSeconds(speed),
          ["--infinite-slider-duration-hover" as string]: toSeconds(speedOnHover ?? speed),
          ["--infinite-slider-gap" as string]: toPixels(gap),
          ["--infinite-slider-direction" as string]: reverse ? "reverse" : "normal",
        } as React.CSSProperties
      }
    >
      <div className="infinite-slider__track flex w-max items-center">
        <div className="infinite-slider__group flex items-center">
          {items.map((child, index) => (
            <div key={`infinite-slider-item-${index}`} className="shrink-0">
              {child}
            </div>
          ))}
        </div>
        <div className="infinite-slider__group flex items-center" aria-hidden>
          {items.map((child, index) => (
            <div key={`infinite-slider-item-dup-${index}`} className="shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .infinite-slider__track {
          animation: infinite-slider-scroll var(--infinite-slider-duration) linear infinite;
          animation-direction: var(--infinite-slider-direction);
          will-change: transform;
        }

        .infinite-slider__group {
          gap: var(--infinite-slider-gap);
          padding-right: var(--infinite-slider-gap);
        }



        @keyframes infinite-slider-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
