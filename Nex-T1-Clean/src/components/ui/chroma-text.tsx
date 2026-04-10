"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type ChromaTextProps = {
  animateOnMount?: boolean;
  children: ReactNode;
  className?: string;
  replayOnHover?: boolean;
};

export function ChromaText({
  animateOnMount = true,
  children,
  className,
  replayOnHover = true,
}: ChromaTextProps): ReactElement {
  const prefersReducedMotion = useReducedMotion();
  const [animationVersion, setAnimationVersion] = useState(0);

  const shouldAnimate =
    !prefersReducedMotion && (animateOnMount || animationVersion > 0);

  const handleMouseEnter = () => {
    if (!replayOnHover || prefersReducedMotion) {
      return;
    }

    setAnimationVersion((current) => current + 1);
  };

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      <span
        key={animationVersion}
        className={cn("auth-chroma-text", shouldAnimate && "auth-chroma-text-animate")}
      >
        {children}
      </span>
    </span>
  );
}
