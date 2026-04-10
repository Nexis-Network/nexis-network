"use client";

import { Skeleton } from "@/components/ui/skeleton";

import {
  ASSETS_TABLE_GRID_CLASS,
  SCREENER_TABLE_SCROLL_AREA_CLASS,
  SCREENER_TABLE_SURFACE_CLASS,
} from "./assets-table.constants";

export function AssetsTableSkeleton() {
  const rows = Array.from({ length: 15 });

  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden ${SCREENER_TABLE_SURFACE_CLASS}`}
    >
      <div className={SCREENER_TABLE_SCROLL_AREA_CLASS}>
        <div
          className={`sticky top-0 z-40 border-b border-[var(--screener-table-border)] bg-[var(--screener-table-surface)] py-3 text-xs uppercase tracking-wide ${ASSETS_TABLE_GRID_CLASS} text-[var(--screener-table-muted)]`}
        >
          {Array.from({ length: 15 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-3 w-16 bg-[var(--screener-table-surface-elevated)]"
            />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {rows.map((_, index) => (
            <div
              key={index}
              className={`items-center border-b border-[var(--screener-table-border)] py-5 ${ASSETS_TABLE_GRID_CLASS}`}
            >
              <div className="flex items-center gap-3 pl-6">
                <Skeleton className="h-4 w-4 bg-[var(--screener-table-surface-elevated)]" />
                <Skeleton className="h-8 w-8 rounded-full bg-[var(--screener-table-surface-elevated)]" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20 bg-[var(--screener-table-surface-elevated)]" />
                  <Skeleton className="h-2 w-12 bg-[var(--screener-table-surface-elevated)]" />
                </div>
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-4 w-16 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-4 w-12 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-4 w-12 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-3 w-14 bg-[var(--screener-table-surface-elevated)]" />
                <Skeleton className="h-2.5 w-10 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-3 w-14 bg-[var(--screener-table-surface-elevated)]" />
                <Skeleton className="h-2.5 w-10 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex justify-center">
                <Skeleton className="h-8 w-20 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-4 w-16 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-4 w-16 bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex justify-center">
                <Skeleton className="h-5 w-16 rounded bg-[var(--screener-table-surface-elevated)]" />
              </div>

              <div className="flex h-full items-center justify-center">
                <div className="flex -space-x-1.5">
                  <Skeleton className="h-5 w-5 rounded-full border border-[var(--screener-table-surface)] bg-[var(--screener-table-surface-elevated)]" />
                  <Skeleton className="h-5 w-5 rounded-full border border-[var(--screener-table-surface)] bg-[var(--screener-table-surface-elevated)]" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pr-6">
                <Skeleton className="h-7 w-7 rounded-full bg-[var(--screener-table-surface-elevated)]" />
                <Skeleton className="h-7 w-7 rounded-full bg-[var(--screener-table-surface-elevated)]" />
                <Skeleton className="h-7 w-7 rounded-full bg-[var(--screener-table-surface-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
