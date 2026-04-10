"use client";

import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type {
  DocsAudienceId,
  DocsAudienceOption,
} from "@/modules/docs/sidebar-navigation";

type DocsAudienceSwitcherProps = {
  activeAudienceId: DocsAudienceId;
  audiences: DocsAudienceOption[];
  onSelect: (audienceId: DocsAudienceId) => void;
};

export function DocsAudienceSwitcher({
  activeAudienceId,
  audiences,
  onSelect,
}: DocsAudienceSwitcherProps) {
  const { isMobile } = useSidebar();
  const activeAudience =
    audiences.find((audience) => audience.id === activeAudienceId) ?? audiences[0];

  if (!activeAudience) {
    return null;
  }

  const ActiveIcon = activeAudience.icon;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-14 rounded-xl bg-white/[0.04] px-3 text-[#efefef] hover:bg-white/[0.06] hover:text-white data-[state=open]:bg-white/[0.08]"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.08] text-white">
                <ActiveIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">
                  {activeAudience.title}
                </span>
                <span className="truncate text-xs text-white/55">
                  {activeAudience.description}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-white/55" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-72 p-2"
          >
            <DropdownMenuLabel className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--auth-menu-muted)]">
              Documentation Tracks
            </DropdownMenuLabel>
            {audiences.map((audience) => {
              const AudienceIcon = audience.icon;
              const isActive = audience.id === activeAudienceId;

              return (
                <DropdownMenuItem
                  key={audience.id}
                  onClick={() => onSelect(audience.id)}
                  className="cursor-pointer rounded-xl px-2 py-2.5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--auth-menu-subtle-bg)] text-[var(--auth-menu-fg)]">
                      <AudienceIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {audience.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--auth-menu-muted)]">
                        {audience.description}
                      </p>
                    </div>
                    {isActive ? (
                      <div className="ml-auto rounded-full border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--auth-menu-muted)]">
                        Active
                      </div>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
