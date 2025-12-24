"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CvmLogsProps } from "@/components/instances/cvm-logs";

const CvmLogs = dynamic(
  () => import("@/components/instances/cvm-logs").then((mod) => mod.CvmLogs),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-secondary">Loading…</CardContent>
      </Card>
    ),
  },
);

export function CvmLogsWrapper(props: CvmLogsProps) {
  return <CvmLogs {...props} />;
}
