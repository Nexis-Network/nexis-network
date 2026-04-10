"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export function LeaderboardFilterSelect({
  label,
  value,
  onValueChange,
  options,
  triggerClassName,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  triggerClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] leading-4 text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          size="sm"
          className={cn(
            "h-9 border-border/50 bg-transparent text-sm text-foreground shadow-none",
            triggerClassName,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

