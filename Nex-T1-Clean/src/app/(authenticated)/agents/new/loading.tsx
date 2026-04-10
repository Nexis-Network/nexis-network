import { Skeleton } from "@/components/ui/skeleton";

export default function AgentWizardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-48 rounded-3xl" />
      <Skeleton className="h-[680px] rounded-3xl" />
    </div>
  );
}
