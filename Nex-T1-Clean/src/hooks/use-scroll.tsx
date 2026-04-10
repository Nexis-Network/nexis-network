"use client";

import { useEffect, useState } from "react";

type ScrollDirection = "up" | "down";

type ScrollState = {
  scrolled: boolean;
  progress: number;
  scrollY: number;
  direction: ScrollDirection;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useScroll(downThreshold: number, upThreshold?: number): ScrollState {
  const scrollUpThreshold = upThreshold ?? downThreshold / 2;
  const progressDistance = Math.max(downThreshold - scrollUpThreshold, 1);
  const [state, setState] = useState<ScrollState>({
    scrolled: false,
    progress: 0,
    scrollY: 0,
    direction: "down",
  });

  useEffect(() => {
    let frame: number | null = null;

    const updateScrollState = () => {
      frame = null;
      const nextScrollY = window.scrollY;
      const nextProgress = Number(
        clamp((nextScrollY - scrollUpThreshold) / progressDistance, 0, 1).toFixed(4)
      );

      setState((previous) => {
        const nextScrolled = previous.scrolled ? nextScrollY > scrollUpThreshold : nextScrollY > downThreshold;
        const resolvedDirection =
          nextScrollY === previous.scrollY ? previous.direction : nextScrollY > previous.scrollY ? "down" : "up";

        if (
          previous.scrolled === nextScrolled &&
          previous.progress === nextProgress &&
          previous.scrollY === nextScrollY &&
          previous.direction === resolvedDirection
        ) {
          return previous;
        }

        return {
          scrolled: nextScrolled,
          progress: nextProgress,
          scrollY: nextScrollY,
          direction: resolvedDirection,
        };
      });
    };

    const handleScroll = () => {
      if (frame !== null) {
        return;
      }

      frame = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [downThreshold, progressDistance, scrollUpThreshold]);

  return state;
}
