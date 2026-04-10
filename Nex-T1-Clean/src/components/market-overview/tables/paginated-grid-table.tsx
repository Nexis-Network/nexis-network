"use client";

import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DATA_TABLE_FONT_STACK } from "@/components/market-overview/data-table";
import { useMediaQuery } from "@/lib/hooks/ui/use-media-query";

export type PaginatedGridColumn<T> = {
  key: string;
  header: string;
  width: string; // e.g. "220px" or "110px"
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
};

type PaginatedGridTableProps<T> = {
  rows: T[];
  columns: PaginatedGridColumn<T>[];
  isLoading: boolean;
  isError: boolean;
  pageSize?: number;
  dataLabel?: string;
  emptyMessage?: string;
  errorMessage?: string;
  footerExtra?: React.ReactNode;
  minWidthPx?: number;
};

export function PaginatedGridTable<T>({
  rows,
  columns,
  isLoading,
  isError,
  pageSize = 10,
  dataLabel,
  emptyMessage = "No rows available.",
  errorMessage = "Unable to load data right now.",
  footerExtra,
  minWidthPx = 720,
}: PaginatedGridTableProps<T>) {
  const [page, setPage] = useState(1);
  const list = useMemo(() => rows ?? [], [rows]);
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const visibleRows = list.slice((page - 1) * pageSize, page * pageSize);
  const isLoadingState = isLoading && list.length === 0;
  const isEmpty = !isLoadingState && list.length === 0;

  useEffect(() => setPage(1), [list.length]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: columns.map((c) => c.width).join(" ") }),
    [columns],
  );
  const shouldEnforceMinWidth = useMediaQuery(minWidthPx ? `(min-width: ${minWidthPx}px)` : "(min-width: 0px)");
  const tableStyle = useMemo(
    () => (minWidthPx && shouldEnforceMinWidth ? { minWidth: minWidthPx } : undefined),
    [minWidthPx, shouldEnforceMinWidth],
  );

  return (
    <div
      className="overflow-hidden rounded-[12px] border border-border/50 bg-card"
      style={{ fontFamily: DATA_TABLE_FONT_STACK }}
    >
      <div className="max-w-full overflow-x-auto">
        <table className="w-full" style={tableStyle}>
          <thead className="bg-muted/50">
            <tr
              className={cn(
                "grid items-center gap-2 border-b border-border/50 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16px] text-muted-foreground sm:gap-3 sm:px-4 sm:text-[11px]",
              )}
              style={gridStyle}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("min-w-0", col.align === "right" ? "text-right" : "text-left")}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card">
            {isLoadingState ? (
              Array.from({ length: pageSize }).map((_, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "grid items-center gap-2 border-b border-border/50 px-3 py-3 sm:gap-3 sm:px-4",
                  )}
                  style={gridStyle}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("min-w-0", col.align === "right" ? "text-right" : "text-left")}
                    >
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr
                className={cn(
                  "grid items-center gap-2 border-b border-border/50 px-3 py-6 text-center text-sm text-muted-foreground sm:gap-3 sm:px-4",
                )}
                style={gridStyle}
              >
                <td className="col-span-full">
                  {isError ? errorMessage : emptyMessage}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => (
                <tr
                  key={(row as UntypedJson as { id?: string })?.id ?? idx}
                  className={cn(
                    "grid items-center gap-2 border-b border-border/50 px-3 py-3 text-sm text-foreground transition-colors hover:bg-muted/50 last:border-b-0 sm:gap-3 sm:px-4",
                  )}
                  style={gridStyle}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("min-w-0", col.align === "right" ? "text-right" : "text-left")}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3 text-[12px] text-muted-foreground">
        <span className="text-[11px] uppercase tracking-[0.16px]">{dataLabel}</span>
        <div className="flex items-center gap-3">
          <span className="text-[12px]">Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border/50 px-3 py-1 text-[11px] tracking-[0.16px] transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-md border border-border/50 px-3 py-1 text-[11px] tracking-[0.16px] transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next
            </button>
          </div>
        </div>
        <span className="text-[11px] text-muted-foreground">{footerExtra}</span>
      </div>
    </div>
  );
}
