import { cn } from "@/lib/utils";
import { MonoValue } from "./mono-value";

const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface CurrencyDisplayProps {
  value: number | null | undefined;
  signed?: boolean;
  compact?: boolean;
  className?: string;
}

export function CurrencyDisplay({ value, signed, compact, className }: CurrencyDisplayProps) {
  if (value == null || !Number.isFinite(value)) {
    return <MonoValue className={cn("text-[var(--settings-foreground-muted)]", className)}>—</MonoValue>;
  }

  const formatted = compact && Math.abs(value) >= 1000
    ? `$${(value / 1000).toFixed(1)}k`
    : USD_FORMAT.format(Math.abs(value));

  const prefix = signed && value !== 0 ? (value > 0 ? "+" : "−") : value < 0 ? "−" : "";
  const display = value < 0 && !signed ? `−${formatted.replace("-", "")}` : `${prefix}${formatted.replace("-", "")}`;

  const colorClass = signed
    ? value > 0
      ? "text-[var(--settings-foreground-strong)]"
      : value < 0
        ? "text-[var(--settings-foreground-strong)]"
        : "text-[var(--settings-foreground-muted)]"
    : undefined;

  return (
    <MonoValue className={cn(colorClass, className)}>{display}</MonoValue>
  );
}
