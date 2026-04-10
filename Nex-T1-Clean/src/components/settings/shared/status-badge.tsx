import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-[var(--settings-border)] bg-[var(--settings-elevated)] text-[var(--settings-foreground-muted)]",
  info: "border-sky-500/20 bg-sky-500/10 text-sky-200",
};

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

export function StatusBadge({ label, variant = "neutral", className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0 text-[11px] font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {label}
    </Badge>
  );
}
