import { Skeleton } from "@/components/ui/skeleton";

export default function LaunchDetailLoading() {
  return (
    <div className="flex h-full min-h-full w-full justify-center overflow-y-auto bg-background px-4 py-4 sm:px-6 sm:py-6">
      <div className="w-full max-w-[1240px] space-y-4 pb-10 sm:space-y-5">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-[300px] w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[320px] rounded-2xl" />
          <Skeleton className="h-[320px] rounded-2xl" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
    </div>
  );
}
