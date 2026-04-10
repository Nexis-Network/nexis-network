import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg bg-muted/50 dark:bg-white/5" />
        <Skeleton className="h-4 w-72 rounded-lg bg-muted/50 dark:bg-white/5" />
      </div>

      {/* Card skeletons */}
      <Skeleton className="h-40 w-full rounded-[20px] bg-muted/50 dark:bg-white/5" />
      <Skeleton className="h-60 w-full rounded-[20px] bg-muted/50 dark:bg-white/5" />
      <Skeleton className="h-32 w-full rounded-[20px] bg-muted/50 dark:bg-white/5" />
    </div>
  );
}
