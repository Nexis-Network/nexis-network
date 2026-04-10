import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MonoValueProps {
  children: ReactNode;
  className?: string;
}

export function MonoValue({ children, className }: MonoValueProps) {
  return (
    <span className={cn("mono-value text-[0.8125rem] leading-none tabular-nums text-[var(--settings-foreground-strong)]", className)}>{children}</span>
  );
}
