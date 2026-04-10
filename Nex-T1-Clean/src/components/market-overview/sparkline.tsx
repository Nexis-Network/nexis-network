"use client";

import { memo, useMemo } from "react";

import { Line, LineChart, ResponsiveContainer } from "recharts";

import { buildZoomedOutSparkline } from "@/modules/prices/market-overview/sparkline";

type SparklineTone = "positive" | "negative" | "neutral";

type SparklineProps = {
  values: number[];
  tone?: SparklineTone;
  className?: string;
};

const toneToColor: Record<SparklineTone, string> = {
  positive: "#31B8C6",
  negative: "#FF5459",
  neutral: "rgba(232,232,227,0.6)",
};

function SparklineComponent({ values, tone = "neutral", className }: SparklineProps) {
  const data = useMemo(() => {
    const zoomedValues = buildZoomedOutSparkline(values);
    return zoomedValues.map((value, index) => ({ index, value }));
  }, [values]);

  if (!data.length) {
    return <div className={className ?? "h-12 w-full"} aria-hidden />;
  }

  return (
    <div className={className ?? "h-12 w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, bottom: 0, left: 0, right: 0 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={toneToColor[tone]}
            strokeWidth={1.6}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const Sparkline = memo(SparklineComponent);
