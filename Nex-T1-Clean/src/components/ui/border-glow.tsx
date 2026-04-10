"use client";

import { memo, useMemo, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  BORDER_GLOW_DROP_SHADOW,
  buildBoxShadow,
  buildMeshGradients,
  createConicMask,
} from "./border-glow.utils";
import { useBorderGlow } from "./use-border-glow";

export interface BorderGlowProps {
  animated?: boolean;
  backgroundColor?: string;
  borderRadius?: number | string;
  children?: ReactNode;
  className?: string;
  colors?: string[];
  coneSpread?: number;
  contentClassName?: string;
  edgeSensitivity?: number;
  fillOpacity?: number;
  glowColor?: string;
  glowIntensity?: number;
  glowOpacityMultiplier?: number;
  glowRadius?: number | string;
  showDropShadow?: boolean;
}

const DEFAULT_COLORS = ["#c084fc", "#f472b6", "#38bdf8"] as const;

function toCssLength(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

export const BorderGlow = memo(function BorderGlow({
  animated = false,
  backgroundColor = "#060010",
  borderRadius = 28,
  children,
  className,
  colors = [...DEFAULT_COLORS],
  coneSpread = 25,
  contentClassName,
  edgeSensitivity = 30,
  fillOpacity = 0.5,
  glowColor = "40 80 80",
  glowIntensity = 1,
  glowOpacityMultiplier = 1,
  glowRadius = 40,
  showDropShadow = true,
}: BorderGlowProps) {
  const {
    cardRef,
    cursorAngle,
    edgeProximity,
    isVisible,
    onPointerEnter,
    onPointerLeave,
    onPointerMove,
  } = useBorderGlow({ animated });

  const colorSensitivity = edgeSensitivity + 20;
  const borderOpacity = isVisible
    ? Math.max(
        0,
        (edgeProximity * 100 - colorSensitivity) /
          (100 - colorSensitivity),
      )
    : 0;
  const glowOpacity =
    (isVisible
      ? Math.max(
          0,
          (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity),
        )
      : 0) * glowOpacityMultiplier;
  const angle = `${cursorAngle.toFixed(3)}deg`;
  const resolvedBorderRadius = toCssLength(borderRadius);
  const resolvedGlowRadius = toCssLength(glowRadius);

  const meshGradients = useMemo(() => buildMeshGradients(colors), [colors]);
  const borderBackground = useMemo(
    () => meshGradients.map((gradient) => `${gradient} border-box`).join(", "),
    [meshGradients],
  );
  const fillBackground = useMemo(
    () => meshGradients.map((gradient) => `${gradient} padding-box`).join(", "),
    [meshGradients],
  );
  const outerGlowBoxShadow = useMemo(
    () => buildBoxShadow(glowColor, glowIntensity),
    [glowColor, glowIntensity],
  );
  const borderMaskStyle = useMemo(
    () =>
      createConicMask(
        angle,
        `${coneSpread}%`,
        `${coneSpread + 15}%`,
        `${100 - coneSpread - 15}%`,
        `${100 - coneSpread}%`,
      ),
    [angle, coneSpread],
  );
  const outerGlowMaskStyle = useMemo(
    () => createConicMask(angle, "2.5%", "10%", "90%", "97.5%"),
    [angle],
  );
  const fillMaskImage = useMemo(
    () =>
      [
        "linear-gradient(to bottom, black, black)",
        "radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)",
        "radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)",
        "radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)",
        "radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)",
        "radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)",
        `conic-gradient(from ${angle} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
      ].join(", "),
    [angle],
  );

  return (
    <div
      ref={cardRef}
      className={cn("relative isolate grid border border-white/15", className)}
      data-border-glow="true"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      style={{
        background: backgroundColor,
        borderRadius: resolvedBorderRadius,
        boxShadow: showDropShadow ? BORDER_GLOW_DROP_SHADOW : "none",
        transform: "translate3d(0, 0, 0.01px)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[1] rounded-[inherit]"
        style={{
          ...borderMaskStyle,
          background: [
            `linear-gradient(${backgroundColor} 0 100%) padding-box`,
            "linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box",
            borderBackground,
          ].join(", "),
          border: "1px solid transparent",
          opacity: borderOpacity,
          transition: isVisible ? "opacity 0.25s ease-out" : "opacity 0.75s ease-in-out",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-[1] rounded-[inherit]"
        style={
          {
            WebkitMaskComposite:
              "source-out, source-over, source-over, source-over, source-over, source-over",
            WebkitMaskImage: fillMaskImage,
            background: fillBackground,
            border: "1px solid transparent",
            maskComposite: "subtract, add, add, add, add, add",
            maskImage: fillMaskImage,
            mixBlendMode: "soft-light",
            opacity: borderOpacity * fillOpacity,
            transition: isVisible ? "opacity 0.25s ease-out" : "opacity 0.75s ease-in-out",
          } satisfies CSSProperties
        }
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute z-[1] rounded-[inherit]"
        style={
          {
            ...outerGlowMaskStyle,
            inset: `calc(${resolvedGlowRadius} * -1)`,
            mixBlendMode: "plus-lighter",
            opacity: glowOpacity,
            transition: isVisible ? "opacity 0.25s ease-out" : "opacity 0.75s ease-in-out",
          } satisfies CSSProperties
        }
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            boxShadow: outerGlowBoxShadow,
            inset: resolvedGlowRadius,
          }}
        />
      </span>

      <div className={cn("relative z-[1] flex min-w-0 flex-col", contentClassName)}>
        {children}
      </div>
    </div>
  );
});
