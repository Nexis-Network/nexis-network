"use client";

import { BarChart3, Database, Sparkles, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableEditorData } from "@/lib/table-editor/ai/types";
import { useTableEditorChat } from "./table-chat-provider";

type TableArtifactLoadingProps = {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
  showTableSkeleton?: boolean;
};

// Table skeleton component that mimics the DataGrid structure
const TableSkeleton = ({ className }: { className?: string }) => {
  const MIN_ROWS = 10;
  const MIN_COLS = 8;

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      {/* Table container with same styling as DataGrid */}
      <div
        className="h-full w-full"
        style={
          {
            "--rdg-border-color": "hsl(var(--border))",
            "--rdg-header-background-color": "hsl(var(--muted))",
            "--rdg-row-hover-background-color": "hsl(var(--muted) / 0.5)",
            "--rdg-selection-color": "hsl(var(--primary) / 0.2)",
            "--rdg-font-size": "13px",
            "--rdg-line-height": "1.4",
            "--rdg-cell-padding": "8px 12px",
          } as React.CSSProperties
        }
      >
        {/* Header row */}
        <div className="flex border-border border-b">
          {/* Row number column */}
          <div className="flex h-10 w-12 items-center justify-center border-border border-r bg-muted">
            <div className="h-3 w-6 animate-pulse rounded bg-muted-foreground/20" />
          </div>
          {/* Data columns */}
          {Array.from({ length: MIN_COLS }, (_, colIndex) => {
            const columnLetter = String.fromCharCode(65 + colIndex);
            return (
              <div
                className={cn(
                  "flex h-10 w-32 items-center justify-center border-border border-r bg-muted px-3",
                  colIndex === 0 && "border-border border-l"
                )}
                key={`header-${columnLetter}`}
              >
                <div className="h-3 w-8 animate-pulse rounded bg-muted-foreground/20" />
              </div>
            );
          })}
        </div>

        {/* Data rows */}
        {Array.from({ length: MIN_ROWS }, (_, rowIndex) => (
          <div className="flex border-border border-b" key={`skeleton-row-${rowIndex + 1}`}>
            {/* Row number */}
            <div className="flex h-10 w-12 items-center justify-center border-border border-r bg-background">
              <div className="h-3 w-4 animate-pulse rounded bg-muted-foreground/10" />
            </div>
            {/* Data cells */}
            {Array.from({ length: MIN_COLS }, (_unused, skeletonColIndex) => {
              const columnLetter = String.fromCharCode(65 + skeletonColIndex);
              return (
                <div
                  className={cn(
                    "flex h-10 w-32 items-center border-border border-r bg-background px-3",
                    skeletonColIndex === 0 && "border-border border-l"
                  )}
                  key={`cell-${rowIndex + 1}-${columnLetter}`}
                >
                  <div
                    className="h-3 animate-pulse rounded bg-muted-foreground/10"
                    style={{
                      width: `${Math.random() * 60 + 40}%`, // Random width between 40-100%
                      animationDelay: `${(rowIndex + skeletonColIndex) * 50}ms`, // Staggered animation
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export function TableArtifactLoading({
  className = "",
  showDetails = true,
  compact = false,
  showTableSkeleton = false,
}: TableArtifactLoadingProps) {
  const { tableArtifact: tableData } = useTableEditorChat();

  if (!tableData?.data || (tableData.data as TableEditorData).stage === "complete") {
    return null;
  }

  const getStageInfo = (stage: string) => {
    switch (stage) {
      case "loading":
        return {
          text: "Initializing analysis...",
          icon: Database,
          description: "Setting up the table editor environment",
        };
      case "profiling":
        return {
          text: "Profiling data structure...",
          icon: BarChart3,
          description: "Analyzing columns and data types",
        };
      case "editing":
        return {
          text: "Preparing editor...",
          icon: Table,
          description: "Loading spreadsheet interface",
        };
      case "applying_changes":
        return {
          text: "Applying changes...",
          icon: Sparkles,
          description: "Processing your modifications",
        };
      default:
        return {
          text: "Processing data...",
          icon: Database,
          description: "Working on your request",
        };
    }
  };

  const data = tableData.data as TableEditorData;
  const stageInfo = getStageInfo(data.stage);
  const IconComponent = stageInfo.icon;
  const progress = data.progress || 0;

  // Show table skeleton for most stages (except loading) or when explicitly requested
  const shouldShowTableSkeleton = showTableSkeleton || data.stage !== "loading";

  if (shouldShowTableSkeleton) {
    return <TableSkeleton className={className} />;
  }

  // Compact mode for smaller spaces
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-muted-foreground text-sm">{stageInfo.text}</span>
        {progress > 0 && <span className="font-mono text-muted-foreground text-xs">{Math.round(progress * 100)}%</span>}
      </div>
    );
  }

  return (
    <div className={`flex h-full items-center justify-center ${className}`}>
      <div className="mx-auto max-w-md px-6 text-center">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <IconComponent className="h-8 w-8 animate-pulse text-primary" />
          </div>
          {/* Pulsing ring effect */}
          <div className="absolute inset-0 mx-auto h-16 w-16 animate-ping rounded-full border-2 border-primary/20 opacity-20" />
        </div>

        {/* Stage Text */}
        <h3 className="mb-2 font-semibold text-foreground text-lg">{stageInfo.text}</h3>

        {showDetails && <p className="mb-6 text-muted-foreground text-sm">{stageInfo.description}</p>}

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="space-y-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                style={{ width: `${progress * 100}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{Math.round(progress * 100)}% complete</span>
              <span className="font-mono text-muted-foreground">{data.stage}</span>
            </div>
          </div>
        )}

        {/* Loading dots animation */}
        {progress === 0 && (
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
          </div>
        )}

        {/* Additional context for specific stages */}
        {data.summary && showDetails && (
          <div className="mt-6 rounded-lg border border-border bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Rows:</span>
                <span className="ml-2 font-medium">{data.summary.rowCount || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Columns:</span>
                <span className="ml-2 font-medium">{data.summary.columnCount || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
