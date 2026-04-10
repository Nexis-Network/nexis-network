"use client";

import type { Dispatch, JSX, SetStateAction } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AssetsTablePagination(args: {
  hasMore: boolean;
  isLoading: boolean;
  limit: number;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}): JSX.Element {
  const start = (args.page - 1) * args.limit + 1;
  const end = Math.min(args.page * args.limit, 10_000);

  return (
    <div className="sticky bottom-0 z-50 flex items-center justify-between border-t border-[var(--screener-table-border)] bg-[var(--screener-table-surface)] px-6 py-2">
      <div className="text-[10px] text-[var(--screener-table-muted)]">
        Showing {start} to {end} of 10k+
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => args.setPage((currentPage) => Math.max(1, currentPage - 1))}
          disabled={args.page === 1 || args.isLoading}
          className="h-6 w-6 rounded-full bg-[var(--screener-table-surface-elevated)] p-0 text-[var(--screener-table-muted)] hover:bg-[var(--screener-table-row-hover)] hover:text-[var(--screener-table-foreground)] disabled:opacity-30"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span className="min-w-[20px] text-center text-xs font-medium text-[var(--screener-table-foreground)]">
          {args.page}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => args.setPage((currentPage) => currentPage + 1)}
          disabled={args.isLoading || !args.hasMore}
          className="h-6 w-6 rounded-full bg-[var(--screener-table-surface-elevated)] p-0 text-[var(--screener-table-muted)] hover:bg-[var(--screener-table-row-hover)] hover:text-[var(--screener-table-foreground)] disabled:opacity-30"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
