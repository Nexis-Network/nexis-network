type DashboardRouteLoadingProps = {
  message?: string;
};

export function DashboardRouteLoading({
  message = "Loading Nex-T1...",
}: DashboardRouteLoadingProps) {
  return (
    <div className="flex min-h-[100svh] w-full items-center justify-center px-6 py-10">
      <div
        aria-live="polite"
        aria-busy="true"
        className="flex max-w-sm flex-col items-center gap-4 text-center"
        role="status"
      >
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
