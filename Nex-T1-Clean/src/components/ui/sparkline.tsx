"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 100, 
  height = 40, 
  color = "#00D5FF",
  className 
}: SparklineProps) {
  
  const points = useMemo(() => {
    if (!data || data.length === 0) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; 

    // Calculate scaling factors
    // We want the chart to fill the height, leaving some padding
    const padding = 2;
    const availHeight = height - (padding * 2);
    
    const stepX = width / (data.length - 1);

    return data.map((val, i) => {
      const x = i * stepX;
      // In SVG, y=0 is top. So we invert: y = height - normalized_val
      // normalized_val = ((val - min) / range) * availHeight
      const normalizedY = ((val - min) / range) * availHeight;
      const y = height - padding - normalizedY;
      return `${x},${y}`;
    }).join(" ");
  }, [data, width, height]);

  return (
    <div className={className} style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
