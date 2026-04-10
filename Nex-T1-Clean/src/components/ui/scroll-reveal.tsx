"use client";

import { useEffect, useRef, ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  stagger?: number;
  threshold?: number; // 0 to 1 (percentage of element visible)
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 1.0,
  yOffset = 40,
  stagger = 0.1,
  threshold = 0.15,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial state
    gsap.set(el.children, {
      y: yOffset,
      opacity: 0,
      filter: "blur(10px)",
    });

    ScrollTrigger.batch(el.children, {
      start: `top bottom-=${window.innerHeight * threshold}`,
      onEnter: (batch) => {
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: duration,
          stagger: stagger,
          ease: "power3.out",
          delay: delay,
          overwrite: true,
        });
      },
      once: true, // Only animate once
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [delay, duration, yOffset, stagger, threshold]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
