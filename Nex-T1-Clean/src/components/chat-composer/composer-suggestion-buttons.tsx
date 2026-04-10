"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AppChatComposerSuggestion } from "./constants";

type ComposerSuggestionButtonsProps = {
  suggestions: readonly AppChatComposerSuggestion[];
  onSelect: (prompt: string) => void;
  compact?: boolean;
  className?: string;
};

export function ComposerSuggestionButtons({
  suggestions,
  onSelect,
  compact = false,
  className,
}: ComposerSuggestionButtonsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[clamp(1rem,10%,4rem)] bg-gradient-to-r from-[#121212] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[clamp(1rem,10%,4rem)] bg-gradient-to-l from-[#121212] to-transparent"
      />

      <div className="no-scrollbar w-full overflow-x-auto px-1">
        <div className="mx-auto flex min-w-max items-center justify-center gap-2 px-[5%]">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              type="button"
              variant="ghost"
              size={compact ? "sm" : "default"}
              onClick={() => onSelect(suggestion.prompt)}
              className={cn(
                "h-auto shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] text-center font-medium text-[#D7D7DB] shadow-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-0",
                compact
                  ? "px-[10.8px] py-[5.4px] text-[9.9px] leading-[14.4px]"
                  : "px-[10.8px] py-[7.2px] text-[10.8px] leading-[14.4px]",
              )}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
