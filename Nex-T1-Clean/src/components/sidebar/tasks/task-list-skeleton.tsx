"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border/50 bg-background/60 p-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <Skeleton className="h-2 w-1/3" />
            <Skeleton className="h-2 w-20" />
          </div>
          <Skeleton className="mt-3 h-2 w-full" />
        </div>
      ))}
    </div>
  );
}
