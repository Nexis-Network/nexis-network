import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Skeleton (Hidden on mobile) */}
      <div className="hidden h-full w-[250px] flex-col border-r border-border/40 bg-sidebar md:flex">
        {/* Sidebar Header */}
        <div className="h-14 border-b border-border/40 px-4 py-3">
           <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        {/* Sidebar Content */}
        <div className="flex-1 space-y-4 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
        {/* Sidebar Footer */}
        <div className="p-4">
             <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 flex-col">
        {/* Topbar/Header */}
        <div className="flex h-14 items-center gap-4 border-b border-border/40 px-6">
           <Skeleton className="h-8 w-8 md:hidden" /> {/* Mobile Toggle */}
           <div className="flex flex-1 justify-end gap-2">
             <Skeleton className="h-8 w-32" />
             <Skeleton className="h-8 w-8 rounded-full" />
           </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-24" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Skeleton className="h-[200px] rounded-xl" />
                 <Skeleton className="h-[200px] rounded-xl" />
                 <Skeleton className="h-[200px] rounded-xl" />
            </div>
             <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
