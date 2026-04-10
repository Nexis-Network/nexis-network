"use client";

export function LeaderboardPageSkeleton() {
  return (
    <div className="flex h-full min-h-[480px] flex-col gap-6 rounded-xl border border-border/40 bg-muted/10 p-6">
      <div className="flex flex-col gap-3">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />
        <div className="h-5 w-80 animate-pulse rounded bg-muted/80" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-lg border border-border/30 bg-background/60 p-4"
          >
            <div className="h-6 w-12 animate-pulse rounded bg-muted/70" />
            <div className="h-6 flex-1 animate-pulse rounded bg-muted/70" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted/70" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
