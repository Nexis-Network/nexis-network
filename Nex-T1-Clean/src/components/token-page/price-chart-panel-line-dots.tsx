import type { JSX } from "react";

import type { ActiveDotProps } from "./price-chart-panel.types";

export function createTerminalDot(
  color: string,
  pulseClass: string,
  totalPoints: number,
): (props: ActiveDotProps) => JSX.Element {
  return function TerminalDot({
    cx = 0,
    cy = 0,
    index,
  }: ActiveDotProps): JSX.Element {
    if (index == null || index !== totalPoints - 1) {
      return <g />;
    }

    return (
      <g pointerEvents="none">
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={color}
          stroke="var(--background)"
          strokeWidth={2}
        />
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={color}
          fillOpacity={0.35}
          className={pulseClass}
        />
      </g>
    );
  };
}

export function createActiveDot(
  color: string,
  pulseClass: string,
): (props: ActiveDotProps) => JSX.Element {
  return function ActiveDot({ cx = 0, cy = 0 }: ActiveDotProps): JSX.Element {
    return (
      <g pointerEvents="none">
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={color}
          stroke="var(--background)"
          strokeWidth={2}
        />
        <circle
          cx={cx}
          cy={cy}
          r={8}
          fill={color}
          fillOpacity={0.45}
          className={pulseClass}
        />
      </g>
    );
  };
}
