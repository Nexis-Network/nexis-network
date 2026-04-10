import { Skeleton } from "@/components/ui/skeleton";

export default function LaunchReceiptsLoading() {
  return (
    <div className="flex h-full min-h-full w-full justify-center overflow-y-auto bg-background px-4 py-4 sm:px-6 sm:py-6">
      <div className="w-full max-w-[1240px] space-y-4 pb-10 sm:space-y-5">
        <Skeleton className="h-10 w-52 rounded-md" />
        <Skeleton className="h-[620px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
