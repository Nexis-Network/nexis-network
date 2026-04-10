import { Skeleton } from "@/components/ui/skeleton";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function SwapLoading() {
  return (
    <DashboardShell>
      <div className="flex h-full w-full flex-col items-center gap-6 p-6">
        <Skeleton className="h-8 w-24" />

        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-8 w-8 self-center mx-auto rounded-full" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </DashboardShell>
  );
}
