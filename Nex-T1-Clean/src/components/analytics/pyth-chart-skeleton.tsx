import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChartSkeleton({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "mt-3 space-y-3 rounded-xl border border-border/40 bg-background/60 p-3",
        className,
      )}
    >
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="rounded-lg border border-border/40 bg-background/70 p-2">
        <Skeleton className="h-[320px] w-full md:h-[380px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
