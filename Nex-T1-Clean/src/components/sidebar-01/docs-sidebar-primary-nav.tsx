"use client";

import { ChevronRight } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { DocsSidebarGroup } from "@/modules/docs/sidebar-navigation";

type DocsSidebarPrimaryNavProps = {
  activeCategoryId: string;
  hoveredCategoryId: string | null;
  groups: DocsSidebarGroup[];
  isMobile: boolean;
  pathname: string;
  onCategoryHover: (categoryId: string) => void;
  onCategorySelect: (categoryId: string) => void;
};

export function DocsSidebarPrimaryNav({
  activeCategoryId,
  hoveredCategoryId,
  groups,
  isMobile,
  pathname,
  onCategoryHover,
  onCategorySelect,
}: DocsSidebarPrimaryNavProps) {
  return groups.map((group) => (
    <SidebarGroup
      key={group.id}
      className="px-0 py-0 [&:not(:first-child)]:mt-7"
    >
      <p className="px-3 pb-3 text-[11px] font-medium text-white/38">
        {group.title}
      </p>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.categories.map((category) => {
            const Icon = category.icon;
            const matchesPath = category.pages.some((page) => page.href === pathname);
            const isActive =
              hoveredCategoryId === category.id ||
              (!hoveredCategoryId &&
                (activeCategoryId === category.id || matchesPath));

            return (
              <SidebarMenuItem key={category.id}>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => {
                    if (isMobile) {
                      onCategorySelect(category.id);
                    }
                  }}
                  onFocus={() => {
                    if (!isMobile) {
                      onCategoryHover(category.id);
                    }
                  }}
                  onMouseEnter={() => {
                    if (!isMobile) {
                      onCategoryHover(category.id);
                    }
                  }}
                  className={cn(
                    "h-11 rounded-lg px-3 text-[13px] leading-5 text-[#d0d0d0]",
                    "hover:bg-white/[0.04] hover:text-white data-[active=true]:bg-white/[0.08] data-[active=true]:text-white",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{category.title}</span>
                  </div>
                  <div className="ml-auto flex items-center text-white/45">
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0",
                        isActive && "text-white/70",
                      )}
                    />
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}
