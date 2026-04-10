"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  variant = "footer",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  variant?: "header" | "footer";
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);

  if (variant === "footer") {
    const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const to = Math.min(total, safePage * pageSize);
    const rangeLabel = total === 0 ? "0" : `${from}-${to}`;

    return (
      <div className={cn("border-t border-border/40 bg-background/20 px-3 py-3", className)}>
        <div className="grid grid-cols-3 items-center">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 justify-self-start"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span
            className="justify-self-center text-xs text-muted-foreground tabular-nums"
            title={`${rangeLabel} of ${total}`}
          >
            Page {safePage}/{pageCount}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 justify-self-end"
            onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
            disabled={safePage >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span className="tabular-nums">{total === 0 ? "0" : `${from}-${to}`} of {total}</span>
      <span className="text-muted-foreground/40">•</span>
      <span className="tabular-nums">Page {safePage}/{pageCount}</span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
          disabled={safePage >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

