"use client";

import { Code2, TerminalSquare, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type RightPanelEmptyStateProps = {
  loading?: boolean;
};

export function RightPanelEmptyState({ loading = false }: RightPanelEmptyStateProps) {
  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background/70 to-background/40 p-8 text-center">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Code2 className="size-4" />
        <TerminalSquare className="size-4" />
        <Globe className="size-4" />
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No active artifact yet</p>
        <p>Ask the assistant to run code, use terminal commands, or generate a web preview.</p>
      </div>
    </div>
  );
}
