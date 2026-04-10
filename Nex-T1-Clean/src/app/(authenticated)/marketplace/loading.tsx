import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <DashboardShell insetClassName="overflow-y-auto bg-background">
      <div className="flex flex-col min-h-screen max-w-[1400px] mx-auto px-6 py-6 space-y-12">
        {/* Nav Skeleton */}
        <div className="w-full flex justify-between items-center h-14">
           <Skeleton className="h-8 w-32 rounded-lg bg-muted/50 dark:bg-white/5" />
           <Skeleton className="h-10 w-64 rounded-xl bg-muted/50 dark:bg-white/5" />
           <div className="flex gap-2">
             <Skeleton className="h-9 w-24 rounded-lg bg-muted/50 dark:bg-white/5" />
             <Skeleton className="h-9 w-24 rounded-lg bg-muted/50 dark:bg-white/5" />
           </div>
        </div>

        {/* Featured Agent Hero */}
        <div className="w-full aspect-[4/5] sm:aspect-[21/9] md:aspect-[3/1] rounded-[24px] bg-muted/50 dark:bg-white/5 overflow-hidden relative">
           <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end">
              <Skeleton className="h-12 w-1/3 mb-4 bg-muted/70 dark:bg-white/10" />
              <Skeleton className="h-6 w-48 mb-6 bg-muted/70 dark:bg-white/10" />
              <div className="flex gap-8">
                 <Skeleton className="h-10 w-20 bg-muted/70 dark:bg-white/10" />
                 <Skeleton className="h-10 w-20 bg-muted/70 dark:bg-white/10" />
                 <Skeleton className="h-10 w-20 bg-muted/70 dark:bg-white/10" />
              </div>
           </div>
        </div>

        {/* Trending Agents */}
        <div className="space-y-4">
           <Skeleton className="h-8 w-48 bg-muted/50 dark:bg-white/5" />
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl bg-muted/50 dark:bg-white/5" />
              ))}
           </div>
        </div>

        {/* Strategy Catalog */}
        <div className="space-y-4">
           <Skeleton className="h-8 w-56 bg-muted/50 dark:bg-white/5" />
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-square rounded-xl bg-muted/50 dark:bg-white/5" />
                  <Skeleton className="h-5 w-3/4 bg-muted/50 dark:bg-white/5" />
                  <Skeleton className="h-4 w-1/2 bg-muted/50 dark:bg-white/5" />
                </div>
              ))}
           </div>
        </div>

        {/* New Agent Releases */}
        <div className="space-y-4">
           <Skeleton className="h-8 w-48 bg-muted/50 dark:bg-white/5" />
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                 <div key={i} className="space-y-2">
                   <Skeleton className="aspect-[1.5/1] rounded-xl bg-muted/50 dark:bg-white/5" />
                   <Skeleton className="h-5 w-3/4 bg-muted/50 dark:bg-white/5" />
                 </div>
              ))}
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}
