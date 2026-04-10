"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";

import { cn } from "@/lib/utils";

import type { AgentState, OrbVariant } from "./orb";

const DynamicOrb = dynamic(() => import("./orb").then((mod) => mod.Orb), {
  ssr: false,
});

type LazyOrbProps = {
  agentState?: AgentState;
  className?: string;
  colors?: [string, string] | [string, string, string];
  dpr?: number | [number, number];
  fallbackClassName?: string;
  resizeDebounce?: number;
  variant?: OrbVariant;
};

const DEFAULT_FALLBACK_COLORS: [string, string] = ["#0ea5e9", "#38bdf8"];

export function LazyOrb({
  agentState,
  className,
  colors = DEFAULT_FALLBACK_COLORS,
  dpr,
  fallbackClassName,
  resizeDebounce,
  variant,
}: LazyOrbProps): JSX.Element {
  const primary = colors[0] ?? DEFAULT_FALLBACK_COLORS[0];
  const secondary = colors[1] ?? primary;
  const tertiary = colors[2] ?? secondary;

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className={cn("absolute inset-0 rounded-[inherit]", fallbackClassName)}
        style={{
          background: [
            `radial-gradient(circle at 28% 28%, ${primary} 0%, transparent 48%)`,
            `radial-gradient(circle at 72% 64%, ${secondary} 0%, transparent 52%)`,
            `linear-gradient(135deg, ${secondary}, ${tertiary})`,
          ].join(", "),
        }}
      >
        <div className="absolute inset-0 bg-black/10" />
      </div>
      <DynamicOrb
        agentState={agentState}
        className="absolute inset-0 h-full w-full"
        colors={colors}
        dpr={dpr}
        resizeDebounce={resizeDebounce}
        variant={variant}
      />
    </div>
  );
}
