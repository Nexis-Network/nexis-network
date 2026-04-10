"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/settings/shared/settings-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SettingsTableShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "settings-table-shell overflow-hidden rounded-[calc(var(--settings-panel-radius)-4px)] border border-[var(--settings-border)] bg-[var(--settings-card-bg)] shadow-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsTable({
  className,
  ...props
}: ComponentProps<typeof Table>) {
  return <Table className={cn(className)} {...props} />;
}

export function SettingsTableHeader({
  className,
  ...props
}: ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader
      className={cn(
        "border-b border-[var(--settings-border)] bg-[var(--settings-elevated)]/80",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsTableBody(props: ComponentProps<typeof TableBody>) {
  return <TableBody {...props} />;
}

export function SettingsTableHeaderRow({
  className,
  ...props
}: ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "border-[var(--settings-border)] hover:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsTableRow({
  className,
  ...props
}: ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn(
        "border-[var(--settings-border)] transition-colors hover:bg-[var(--settings-elevated)]/70",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsTableHead({
  className,
  ...props
}: ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn(
        "h-11 px-4 text-xs font-medium text-[var(--settings-foreground-muted)]",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsTableCell({
  className,
  ...props
}: ComponentProps<typeof TableCell>) {
  return (
    <TableCell
      className={cn(
        "px-4 py-3 align-middle text-sm font-normal text-[var(--settings-foreground-strong)]",
        className,
      )}
      {...props}
    />
  );
}

export function SettingsTableEmptyCell({
  className,
  ...props
}: ComponentProps<typeof TableCell>) {
  return (
    <SettingsTableCell
      className={cn(
        "h-24 text-center text-sm text-[var(--settings-foreground-muted)]",
        className,
      )}
      {...props}
    />
  );
}

type SettingsTablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function SettingsTablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
}: SettingsTablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--settings-border)] px-4 py-3 text-xs text-[var(--settings-foreground-muted)]">
      <p>
        Showing{" "}
        <span className="font-medium tabular-nums text-[var(--settings-foreground-strong)]">
          {startItem}-{endItem}
        </span>{" "}
        of{" "}
        <span className="font-medium tabular-nums text-[var(--settings-foreground-strong)]">
          {totalItems}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <p className="px-2">
          Page{" "}
          <span className="font-medium tabular-nums text-[var(--settings-foreground-strong)]">
            {page}
          </span>{" "}
          of{" "}
          <span className="font-medium tabular-nums text-[var(--settings-foreground-strong)]">
            {totalPages}
          </span>
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
