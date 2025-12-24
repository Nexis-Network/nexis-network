"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CvmMetricsProps } from "@/components/instances/cvm-metrics";

const CvmMetrics = dynamic(
  () => import("@/components/instances/cvm-metrics").then((mod) => mod.CvmMetrics),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-secondary">Loading…</CardContent>
      </Card>
    ),
  },
);

export function CvmMetricsWrapper(props: CvmMetricsProps) {
  return <CvmMetrics {...props} />;
}
