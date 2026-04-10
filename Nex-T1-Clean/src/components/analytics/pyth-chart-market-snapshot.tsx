import dynamic from "next/dynamic";
import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { MarketSnapshotRow } from "@/components/market-overview/market-snapshot-table";

const MarketSnapshotTable = dynamic(
  () =>
    import("@/components/market-overview/market-snapshot-table").then(
      (mod) => mod.MarketSnapshotTable,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-32 w-full rounded-xl" />,
  },
);

type PythChartMarketSnapshotProps = {
  isPriceUp: boolean;
  metricsRow: MarketSnapshotRow | null;
};

export function PythChartMarketSnapshot({
  isPriceUp,
  metricsRow,
}: PythChartMarketSnapshotProps): JSX.Element | null {
  if (!metricsRow) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground/70">
        Market Snapshot
      </p>
      <div className="overflow-hidden rounded-lg border border-border/40 bg-background/70">
        <MarketSnapshotTable isPriceUp={isPriceUp} row={metricsRow} />
      </div>
    </div>
  );
}
