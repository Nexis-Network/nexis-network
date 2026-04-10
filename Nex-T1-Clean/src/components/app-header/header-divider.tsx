import { cn } from "@/lib/utils";

export function HeaderDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-px bg-[var(--auth-nav-divider)]", className)}
      aria-hidden="true"
    />
  );
}
