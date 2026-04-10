"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type RotatingChromaWordProps = {
  words: readonly string[];
  className?: string;
  rotationMs?: number;
};

const DEFAULT_ROTATION_MS = 2400;

export function RotatingChromaWord({
  words,
  className,
  rotationMs = DEFAULT_ROTATION_MS,
}: RotatingChromaWordProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const rotateWord = useEffectEvent(() => {
    startTransition(() => {
      setActiveIndex((current) => (current + 1) % words.length);
    });
  });

  useEffect(() => {
    if (prefersReducedMotion || words.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(rotateWord, rotationMs);
    return () => window.clearInterval(intervalId);
  }, [prefersReducedMotion, rotationMs, words.length]);

  const activeWord = words[activeIndex] ?? words[0];
  if (!activeWord) {
    return null;
  }

  return (
    <span className={cn("auth-rotating-word-shell", className)}>
      <span
        key={activeWord}
        className={cn(
          "auth-chroma-text auth-rotating-word",
          !prefersReducedMotion && "auth-rotating-word-animate",
        )}
      >
        {activeWord}
      </span>
    </span>
  );
}
