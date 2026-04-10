import React from "react";

import { Skeleton } from "@/components/ui/skeleton";

export const DATA_TABLE_FONT_STACK = "'Geist', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";

type DataTableWrapperProps = {
  label: string;
  columns: string[];
  template: string;
  minWidth?: number | string;
  bodyHeight?: number;
  children: React.ReactNode;
};

export function DataTableWrapper({
  label,
  columns,
  template,
  minWidth = "720px",
  bodyHeight = 284,
  children,
}: DataTableWrapperProps) {
  const minWidthStyle = typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  return (
    <div
      className="flex flex-col gap-4"
      style={{ minHeight: 318, fontFamily: DATA_TABLE_FONT_STACK }}
    >
      <div className="max-w-full overflow-x-auto">
        <div
          role="table"
          aria-label={label}
          className="overflow-hidden rounded-2xl border border-[rgba(120,120,128,0.16)] bg-white dark:border-[rgba(120,120,128,0.2)] dark:bg-[#101012]"
          style={{ minWidth: minWidthStyle }}
        >
          <div role="rowgroup">
            <div
              role="row"
              className="grid min-h-12 border-b border-[rgba(120,120,128,0.16)] bg-white px-4 py-3 text-[14px] font-medium tracking-[-0.25px] text-[#101012] dark:border-[rgba(120,120,128,0.2)] dark:bg-[#101012] dark:text-white"
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((column) => (
                <span
                  key={column}
                  role="columnheader"
                  className="flex items-center text-[14px] leading-3 font-medium"
                >
                  {column}
                </span>
              ))}
            </div>
          </div>
          <div
            role="rowgroup"
            className="overflow-y-auto bg-white text-[#101012] dark:bg-[#101012] dark:text-white"
            style={{ maxHeight: bodyHeight, minHeight: bodyHeight }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

type TableSkeletonProps = {
  rows: number;
  columns: number;
  template: string;
};

export function TableSkeleton({ rows, columns, template }: TableSkeletonProps) {
  return (
    <div
      className="divide-y divide-[rgba(120,120,128,0.16)] dark:divide-[rgba(120,120,128,0.2)]"
      role="presentation"
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          role="row"
          className="grid items-center gap-3 px-4 py-4 odd:bg-white even:bg-[#F7F8FA] dark:odd:bg-[#101012] dark:even:bg-[#1C1C1E]"
          style={{ gridTemplateColumns: template }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className="h-4 w-full bg-[rgba(120,120,128,0.16)] dark:bg-[rgba(120,120,128,0.32)]"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableEmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex h-full items-center justify-center px-6 text-base tracking-[-0.25px] text-[rgba(60,60,67,0.72)] dark:text-[rgba(176,176,185,0.72)]"
      role="row"
    >
      <span>{message}</span>
    </div>
  );
}

export function getDeltaColorClass(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || value === 0) {
    return "text-muted-foreground";
  }
  if (value > 0) {
    return "text-teal-600 dark:text-teal-400";
  }
  return "text-red-600 dark:text-red-400";
}
