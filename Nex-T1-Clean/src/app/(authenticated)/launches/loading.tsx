import { Skeleton } from "@/components/ui/skeleton";

export default function LaunchesLoading() {
  return (
    <div className="flex h-full min-h-full w-full bg-background">
      <aside className="hidden w-[320px] shrink-0 border-r border-border/60 px-6 py-4 xl:block">
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="mt-4 h-8 w-full rounded-md" />
        <Skeleton className="mt-6 h-8 w-1/2 rounded" />
        <Skeleton className="mt-3 h-24 w-full rounded" />
        <Skeleton className="mt-6 h-8 w-1/2 rounded" />
        <Skeleton className="mt-3 h-20 w-full rounded" />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/60 p-4 xl:p-6">
          <Skeleton className="h-8 w-[440px] rounded-md" />
        </div>
        <div className="border-b border-border/60 p-4 xl:px-0 xl:py-2">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="space-y-1 p-4 xl:p-0">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}
