"use client";

import { useEffect, useMemo, useRef, useState, type SVGProps } from "react";

import { cn } from "@/lib/utils";

interface DotPatternProps extends SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  cr?: number;
  className?: string;
  [key: string]: UntypedJson;
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  ...props
}: DotPatternProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width: boundingWidth, height: boundingHeight } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: boundingWidth, height: boundingHeight });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const dots = useMemo(() => {
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);
    const columns = Math.ceil(dimensions.width / safeWidth);
    const rows = Math.ceil(dimensions.height / safeHeight);

    return Array.from({ length: Math.max(columns * rows, 0) }, (_, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: col * safeWidth + cx + x,
        y: row * safeHeight + cy + y,
      };
    });
  }, [cx, cy, dimensions.height, dimensions.width, height, width, x, y]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-neutral-400/95", className)}
      {...props}
    >
      {dots.map((dot) => (
        <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={cr} fill="currentColor" />
      ))}
    </svg>
  );
}
