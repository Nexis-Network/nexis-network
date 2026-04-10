"use client";

import { type RefObject, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";

import { ComposerPopupShell } from "@/components/chat-composer/composer-popup-shell";
import type {
  CommandInventoryFilter,
  CommandInventoryKind,
} from "@/components/chat-composer/command-inventory";
import type { CommandPaletteItem } from "./types";
import { cn } from "@/lib/utils";

type CommandPaletteProps = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  items: CommandPaletteItem[];
  filters: CommandInventoryFilter[];
  commandInputRef: RefObject<HTMLInputElement | null>;
};

function matchesQuery(item: CommandPaletteItem, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const fields = [
    item.label,
    item.value,
    item.hint,
    item.category,
    ...(item.keywords ?? []),
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.toLowerCase());

  return fields.some((field) => field.includes(normalizedQuery));
}

export function CommandPalette({
  open,
  query,
  onQueryChange,
  onClose,
  items,
  filters,
  commandInputRef,
}: CommandPaletteProps) {
  const [activeFilter, setActiveFilter] =
    useState<CommandInventoryFilter["id"]>("all");

  useEffect(() => {
    if (open) {
      setActiveFilter("all");
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesKind =
        activeFilter === "all" || item.kind === (activeFilter as CommandInventoryKind);
      return matchesKind && matchesQuery(item, query);
    });
  }, [activeFilter, items, query]);

  return (
    <ComposerPopupShell
      open={open}
      label="Command menu"
      query={query}
      onQueryChange={onQueryChange}
      onClose={onClose}
      searchPlaceholder="Search tools, capabilities, artifacts, or MCP servers…"
      inputRef={commandInputRef}
      afterSearch={
        <div className="border-b border-border/60 px-3 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {filter.label} ({filter.count})
                </button>
              );
            })}
          </div>
        </div>
      }
      footer={
        <span>Live agent inventory • Use ↑ ↓ to navigate • Enter to insert</span>
      }
    >
      {filteredItems.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          No matching tools or capabilities found.
        </div>
      ) : (
        filteredItems.map((command) => (
          <Command.Item
            key={command.id}
            value={command.value}
            className={cn(
              "nex-command-item relative cursor-pointer border-b border-border/40 px-4 py-3 text-left text-sm last:border-b-0",
              "focus-visible:outline-none",
            )}
            onSelect={() => {
              command.perform();
              onClose();
            }}
          >
            <div className="relative z-[1] flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">{command.label}</span>
              {command.kind ? (
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {command.kind}
                </span>
              ) : null}
            </div>
            {command.hint ? (
              <span className="relative z-[1] text-xs text-muted-foreground">
                {command.hint}
              </span>
            ) : null}
            {command.category ? (
              <span className="relative z-[1] text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
                {command.category}
              </span>
            ) : null}
          </Command.Item>
        ))
      )}
    </ComposerPopupShell>
  );
}
