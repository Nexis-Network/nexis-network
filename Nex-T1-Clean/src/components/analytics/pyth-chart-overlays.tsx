import type { JSX } from "react";

import type { TrendLinesOverlayProps } from "./pyth-chart.types";

export function TrendLinesOverlay({
  draftLine,
  offset,
  trendLines,
  xAxisMap,
  yAxisMap,
}: TrendLinesOverlayProps): JSX.Element | null {
  const xAxis = xAxisMap ? Object.values(xAxisMap)[0] : undefined;
  const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : undefined;
  const xScale = typeof xAxis?.scale === "function" ? xAxis.scale : undefined;
  const yScale = typeof yAxis?.scale === "function" ? yAxis.scale : undefined;

  if (typeof xScale !== "function" || typeof yScale !== "function") {
    return null;
  }

  const xOffset = offset?.left ?? 0;
  const yOffset = offset?.top ?? 0;
  const lines = [
    ...trendLines.map((line) => ({ isDraft: false, line })),
    ...(draftLine ? [{ isDraft: true, line: draftLine }] : []),
  ];

  if (!lines.length) {
    return null;
  }

  return (
    <g pointerEvents="none">
      {lines.map(({ isDraft, line }) => {
        const startX = xScale(line.start.date);
        const startY = yScale(line.start.value);
        const endX = xScale(line.end.date);
        const endY = yScale(line.end.value);

        if (
          typeof startX !== "number" ||
          typeof startY !== "number" ||
          typeof endX !== "number" ||
          typeof endY !== "number" ||
          [startX, startY, endX, endY].some((value) => Number.isNaN(value))
        ) {
          return null;
        }

        return (
          <line
            key={line.id}
            x1={startX + xOffset}
            y1={startY + yOffset}
            x2={endX + xOffset}
            y2={endY + yOffset}
            stroke={isDraft ? "rgba(99, 102, 241, 0.5)" : "rgba(99, 102, 241, 0.95)"}
            strokeWidth={isDraft ? 1.5 : 2}
            strokeDasharray={isDraft ? "6 4" : undefined}
          />
        );
      })}
    </g>
  );
}
