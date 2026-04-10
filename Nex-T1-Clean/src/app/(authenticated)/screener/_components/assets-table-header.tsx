"use client";

import type { JSX } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  ASSETS_TABLE_GRID_CLASS,
  SCREENER_TABLE_STICKY_LEFT_SURFACE_CLASS,
} from "./assets-table.constants";
import type { AssetsTableSortConfig, AssetsTableSortKey } from "./assets-table.types";

function SortableHeaderButton(args: {
  alignClassName: string;
  className?: string;
  label: string;
  onSort: (key: AssetsTableSortKey) => void;
  sortConfig: AssetsTableSortConfig;
  sortKey: AssetsTableSortKey;
}): JSX.Element {
  const isActive = args.sortConfig.key === args.sortKey;

  return (
    <button
      onClick={() => args.onSort(args.sortKey)}
      className={`${args.alignClassName} group/h flex items-center gap-1.5 transition-colors hover:text-[var(--screener-table-foreground)] ${isActive ? "text-[var(--screener-table-foreground)]" : "text-[var(--screener-table-muted)]"} ${args.className ?? ""}`}
    >
      <span>{args.label}</span>
      <div className="flex flex-col -space-y-1 opacity-0 transition-opacity group-hover/h:opacity-100">
        <ChevronUp
          className={`h-2.5 w-2.5 ${isActive && args.sortConfig.direction === "asc" ? "text-[var(--screener-table-info)] opacity-100" : "opacity-30"}`}
        />
        <ChevronDown
          className={`h-2.5 w-2.5 ${isActive && args.sortConfig.direction === "desc" ? "text-[var(--screener-table-info)] opacity-100" : "opacity-30"}`}
        />
      </div>
    </button>
  );
}

export function AssetsTableHeader(args: {
  onSort: (key: AssetsTableSortKey) => void;
  sortConfig: AssetsTableSortConfig;
}): JSX.Element {
  return (
    <div
      className={`sticky top-0 z-40 border-b border-[var(--screener-table-border)] bg-[var(--screener-table-surface)] py-3 text-xs font-normal uppercase tracking-wide text-[var(--screener-table-muted)] shadow-[var(--screener-table-header-shadow)] ${ASSETS_TABLE_GRID_CLASS}`}
    >
      <SortableHeaderButton
        alignClassName={`sticky left-0 z-30 pl-6 text-left ${SCREENER_TABLE_STICKY_LEFT_SURFACE_CLASS}`}
        label="Asset"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="name"
      />
      <SortableHeaderButton
        alignClassName="justify-end text-right"
        label="Price"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="currentPrice"
      />
      <SortableHeaderButton
        alignClassName="justify-end text-right"
        label="24H"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="priceChangePercentage24h"
      />
      <SortableHeaderButton
        alignClassName="justify-end text-right"
        label="7D"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="priceChangePercentage7d"
      />
      <div className="text-right">High 24H</div>
      <div className="text-right">High 7D</div>
      <div className="pl-4 text-center">Trend</div>
      <SortableHeaderButton
        alignClassName="justify-end text-right"
        label="MCap"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="marketCap"
      />
      <SortableHeaderButton
        alignClassName="justify-end text-right"
        label="Vol 24H"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="volume24hUsd"
      />
      <SortableHeaderButton
        alignClassName="justify-center"
        label="Signal"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="signal"
      />
      <SortableHeaderButton
        alignClassName="pl-2 text-left"
        label="Cat."
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="narrative"
      />
      <SortableHeaderButton
        alignClassName="justify-center text-center"
        label="Safe"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="auditScore"
      />
      <SortableHeaderButton
        alignClassName="justify-center text-center"
        label="Soc %"
        onSort={args.onSort}
        sortConfig={args.sortConfig}
        sortKey="socialDominance"
      />
      <div className="text-center">Pair</div>
      <div className="sticky right-0 z-30 bg-[var(--screener-table-surface)] pr-6 text-right shadow-[var(--screener-table-sticky-shadow)]">
        Action
      </div>
    </div>
  );
}
