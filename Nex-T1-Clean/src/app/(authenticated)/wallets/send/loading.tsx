import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function SendLoading() {
  return (
    <DashboardShell>
      <div className="flex h-full w-full flex-col items-center gap-6 p-6">
        <Skeleton className="h-8 w-28" />

        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </DashboardShell>
  );
}
