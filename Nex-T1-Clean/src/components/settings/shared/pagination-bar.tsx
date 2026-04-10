"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonoValue } from "./mono-value";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({ page, pageSize, totalItems, onPageChange, className }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div className={cn("flex items-center justify-between pt-3", className)}>
      <span className="text-[11px] text-[var(--settings-foreground-muted)]">
        <MonoValue>{start}</MonoValue>–<MonoValue>{end}</MonoValue> of <MonoValue>{totalItems}</MonoValue>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md p-1 text-[var(--settings-foreground-muted)] transition-colors hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[40px] text-center text-[11px] text-[var(--settings-foreground-muted)]">
          <MonoValue>{page}</MonoValue> / <MonoValue>{totalPages}</MonoValue>
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md p-1 text-[var(--settings-foreground-muted)] transition-colors hover:bg-[var(--settings-elevated)] hover:text-[var(--settings-foreground-strong)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
