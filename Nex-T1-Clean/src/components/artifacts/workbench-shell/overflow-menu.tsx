"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WorkbenchIcon } from "./icons";
import type { WorkbenchShellAction } from "./types";

type WorkbenchShellOverflowMenuProps = {
  items: WorkbenchShellAction[];
};

export function WorkbenchShellOverflowMenu({
  items,
}: WorkbenchShellOverflowMenuProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-testid="artifact-overflow-trigger"
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-[var(--artifact-radius-control)] border border-transparent bg-transparent text-[var(--artifact-workbench-icon-inactive)] transition hover:bg-[var(--artifact-control-hover)] hover:text-[var(--artifact-workbench-icon-active)]",
          )}
          aria-label="Open artifact views menu"
        >
          <WorkbenchIcon name="overflow" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "[--auth-menu-bg:var(--artifact-toolbar)] [--auth-menu-border:var(--artifact-border-strong)] [--auth-menu-fg:var(--artifact-foreground)] [--auth-menu-muted:var(--artifact-muted)] [--auth-menu-hover-bg:var(--artifact-control-hover)] [--auth-menu-hover-fg:var(--artifact-foreground)] [--auth-menu-shadow:var(--artifact-shadow)] [--auth-menu-separator:var(--artifact-divider)] min-w-48",
        )}
      >
        <DropdownMenuLabel>Additional Views</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            disabled={item.disabled}
            onSelect={item.onSelect}
            data-testid={item.testId ?? `artifact-overflow-item-${item.id}`}
          >
            <WorkbenchIcon name={item.icon} className="text-current" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
