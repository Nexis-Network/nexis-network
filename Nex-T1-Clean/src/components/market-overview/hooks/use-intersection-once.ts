"use client";

import { useEffect, useRef, useState } from "react";

import { VIEWPORT_GUTTER } from "@/components/market-overview/constants";

export function useIntersectionOnce(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (hasEntered) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasEntered(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: VIEWPORT_GUTTER, threshold: 0.01, ...options },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasEntered, options]);

  return { ref, hasEntered };
}
