"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type NativeBalanceValueProps = {
  className?: string;
  icon?: ReactNode;
  showLogo?: boolean;
  value: string | null;
  symbol: string;
  loading?: boolean;
  hasError?: boolean;
  placeholder?: string;
};

export function NativeBalanceValue({
  className,
  icon,
  showLogo = true,
  value,
  symbol,
  loading = false,
  hasError = false,
  placeholder = "--",
}: NativeBalanceValueProps) {
  if (loading && !value) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showLogo ? <div className="h-4 w-4 animate-pulse rounded bg-muted dark:bg-white/10" /> : null}
        <div className="h-4 w-16 animate-pulse rounded bg-muted dark:bg-white/10" />
      </div>
    );
  }

  if (hasError || !value) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        {showLogo ? icon : null}
        <span className="text-sm">{placeholder}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLogo ? icon : null}
      <span className="text-sm font-medium text-foreground dark:text-white">
        {value} {symbol}
      </span>
    </div>
  );
}
