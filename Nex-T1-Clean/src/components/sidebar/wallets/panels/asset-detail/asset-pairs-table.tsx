"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type AssetPairsTableRow = {
  primary: string;
  secondary?: string | null;
  metricA?: string | null;
  metricB?: string | null;
  source?: string | null;
};

type AssetPairsTableProps = {
  title: string;
  rows: AssetPairsTableRow[];
  emptyMessage?: string;
  defaultVisible?: number;
};

export function AssetPairsTable({
  title,
  rows,
  emptyMessage = "No data available",
  defaultVisible = 10,
}: AssetPairsTableProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleRows = useMemo(() => {
    if (expanded) return rows;
    return rows.slice(0, defaultVisible);
  }, [defaultVisible, expanded, rows]);

  return (
    <Card className="border-white/10 bg-[#c4c4c4]/5">
      <CardContent className="space-y-2 p-3">
        <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{title}</div>

        {rows.length === 0 ? (
          <div className="py-2 text-xs text-zinc-500">{emptyMessage}</div>
        ) : (
          <div className="space-y-1.5">
            {visibleRows.map((row, index) => (
              <div
                key={`${row.primary}-${row.secondary || ""}-${index}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/5 bg-black/20 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-white">{row.primary}</div>
                  {row.secondary ? <div className="truncate text-[10px] text-zinc-500">{row.secondary}</div> : null}
                </div>

                <div className="shrink-0 text-right">
                  {row.metricA ? <div className="text-[11px] font-medium text-white tabular-nums">{row.metricA}</div> : null}
                  <div className="text-[10px] text-zinc-500 tabular-nums">{row.metricB || row.source || "-"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {rows.length > defaultVisible ? (
          <div className="pt-1 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((prev) => !prev)}
              className="h-7 px-3 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              {expanded ? "Show less" : `Show more (${rows.length - defaultVisible})`}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
