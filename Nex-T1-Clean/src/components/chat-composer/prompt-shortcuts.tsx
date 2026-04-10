"use client";

import { memo } from "react";

import { Button } from "@/components/ui/button";

import { PROMPTS } from "./constants";

type PromptShortcutsProps = {
  onSelect: (prompt: string) => void;
};

function PromptShortcutsComponent({ onSelect }: PromptShortcutsProps) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-full w-[10%] bg-linear-to-r from-[#F3F3F3] to-transparent dark:from-[#121212]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-full w-[10%] bg-linear-to-l from-[#F3F3F3] to-transparent dark:from-[#121212]"
      />
      <div className="flex flex-nowrap items-center justify-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
        {PROMPTS.map((button) => {
          const IconComponent = button.icon;
          return (
            <Button
              key={button.text}
              variant="ghost"
              className="group flex h-auto items-center gap-1.5 rounded-full border border-border/40 bg-transparent px-2 py-1.5 text-xs text-foreground transition-all duration-200 hover:border-sky-400/20 hover:bg-[linear-gradient(to_right,rgba(14,165,233,0.1),rgba(56,189,248,0.1),rgba(34,211,238,0.1))] hover:text-sky-300 dark:bg-muted"
              onClick={() => onSelect(button.prompt)}
            >
              <IconComponent className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-sky-300" />
              <span>{button.text}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export const PromptShortcuts = memo(PromptShortcutsComponent);
