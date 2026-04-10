import { cn } from "@/lib/utils";

export function FooterDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-4 w-px bg-[var(--auth-footer-divider)]", className)}
      aria-hidden="true"
    />
  );
}
