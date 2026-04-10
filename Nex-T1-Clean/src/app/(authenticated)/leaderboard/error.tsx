"use client";

type LeaderboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LeaderboardError({ error, reset }: LeaderboardErrorProps) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <div>
        <h2 className="text-lg font-regular text-destructive">Unable to load leaderboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred while loading leaderboard data."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        Try again
      </button>
    </div>
  );
}
