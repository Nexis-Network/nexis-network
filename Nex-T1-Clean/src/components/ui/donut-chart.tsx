"use client";

import { cn } from "@/lib/utils";

interface DonutChartProps {
  value: number;
  total: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function DonutChart({
  value,
  total,
  label,
  size = 96,
  strokeWidth = 4,
  className,
}: DonutChartProps) {
  const percentage = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  return (
    <div className={cn("nex-circular-progress", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="nex-circular-progress-track"
        />
        {/* Active arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="nex-circular-progress-fill"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="nex-chart-label-value tabular-nums">
          {Math.round(percentage)}%
        </span>
        {label && (
          <span className="nex-chart-label-muted">{label}</span>
        )}
      </div>
    </div>
  );
}
