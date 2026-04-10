"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import useMeasure from "react-use-measure";

import type { AgentListItem } from "@/lib/agents/types";
import { cn } from "@/lib/utils";
import { AgentCard } from "@/components/agents/agent-card";
import { Skeleton } from "@/components/ui/skeleton";

type AgentsGridProps = {
  agents: AgentListItem[];
  isLoading?: boolean;
  emptyMessage?: string;
};

const ESTIMATED_ROW_HEIGHT = 360;

export function AgentsGrid({ agents, isLoading = false, emptyMessage }: AgentsGridProps) {
  const [containerRef, bounds] = useMeasure();
  const scrollRef = useRef<HTMLDivElement>(null);

  const columnCount = useMemo(() => {
    const width = bounds.width || 0;
    if (width >= 1200) return 3;
    if (width >= 768) return 2;
    return 1;
  }, [bounds.width]);

  const rowCount = useMemo(() => {
    if (!agents.length) return 1;
    return Math.ceil(agents.length / columnCount);
  }, [agents.length, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 4,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  const content = useMemo(() => {
    if (!agents.length && !isLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-[var(--settings-border-soft)] bg-[rgba(15,15,16,0.48)] text-center text-sm text-[var(--settings-foreground-muted)]">
          <p className="font-medium text-[var(--settings-foreground-strong)]">No agents match your filters yet.</p>
          <p className="max-w-sm text-xs text-[var(--settings-foreground-subtle)]">
            {emptyMessage ??
              "Adjust your filters or create a new agent to be the first listing in this category."}
          </p>
        </div>
      );
    }

    return (
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-y-auto rounded-[20px] border border-[var(--settings-border-soft)] bg-[linear-gradient(180deg,rgba(28,28,29,0.62)_0%,rgba(15,15,16,0.4)_100%)] p-4"
      >
        <div style={{ height: totalHeight }} className="relative w-full">
          {virtualItems.map((virtualRow) => {
            const startIndex = virtualRow.index * columnCount;
            const rowAgents = agents.slice(startIndex, startIndex + columnCount);
            return (
              <div
                key={virtualRow.key}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: virtualRow.size,
                  paddingBottom: 16,
                }}
              >
                <div
                  className={cn(
                    "grid gap-4 grid-cols-1",
                    columnCount >= 2 && "md:grid-cols-2",
                    columnCount >= 3 && "xl:grid-cols-3",
                  )}
                >
                  {rowAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                  {rowAgents.length < columnCount
                    ? Array.from({ length: columnCount - rowAgents.length }).map((_, index) => (
                        <div key={`spacer-${virtualRow.key}-${index}`} aria-hidden="true" />
                      ))
                    : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [agents, columnCount, emptyMessage, isLoading, totalHeight, virtualItems]);

  return (
    <div
      ref={containerRef}
      className="relative h-[min(1200px,calc(100vh-220px))] min-h-[28rem] w-full"
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading ? (
        <div className="grid h-full animate-pulse grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-full rounded-[20px] bg-white/[0.06]"
            />
          ))}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
