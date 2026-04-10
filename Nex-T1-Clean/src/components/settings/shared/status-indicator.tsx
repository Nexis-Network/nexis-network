import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status?: "online" | "warning" | "offline" | "syncing";
  className?: string;
  size?: number;
}

export function StatusIndicator({ status = "online", className, size = 6 }: StatusIndicatorProps) {
  const sizeClass =
    {
      4: "size-1",
      6: "size-1.5",
      8: "size-2",
      10: "size-2.5",
      12: "size-3",
    }[size] ?? "size-1.5";

  const statusClass =
    {
      online: "bg-emerald-500",
      warning: "bg-amber-500",
      offline: "bg-[var(--settings-foreground-muted)]/60",
      syncing: "bg-sky-500 animate-pulse",
    }[status] ?? "bg-emerald-500";

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex rounded-full", sizeClass, statusClass, className)}
    />
  );
}
