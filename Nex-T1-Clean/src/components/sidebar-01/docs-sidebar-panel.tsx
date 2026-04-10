"use client";

import Link from "next/link";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type {
  DocsAudienceOption,
  DocsSidebarCategory,
} from "@/modules/docs/sidebar-navigation";

type DocsSidebarPanelProps = {
  audience: DocsAudienceOption;
  category: DocsSidebarCategory;
  pathname: string;
};

export function DocsSidebarPanel({
  audience,
  category,
  pathname,
}: DocsSidebarPanelProps) {
  const AudienceIcon = audience.icon;
  const CategoryIcon = category.icon;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/6 px-4 py-4">
        <div className="flex items-center gap-2 text-[11px] font-medium text-white/40">
          <div className="flex size-6 items-center justify-center rounded-md bg-white/[0.06] text-white/80">
            <AudienceIcon className="size-3.5" />
          </div>
          {audience.title}
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white">
            <CategoryIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#f4f4f4]">
              {category.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-white/52">
              {category.description}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 overscroll-contain [scrollbar-gutter:stable]">
        <SidebarMenu>
          {category.pages.map((page) => {
            const PageIcon = page.icon;
            const isActive = pathname === page.href;

            return (
              <SidebarMenuItem key={page.id}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className="h-auto rounded-lg px-3 py-3 text-[#d8d8d8] hover:bg-white/[0.04] hover:text-white data-[active=true]:bg-white/[0.08] data-[active=true]:text-white"
                >
                  <Link href={page.href}>
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/78">
                        <PageIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {page.title}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-white/48">
                          {page.summary}
                        </p>
                      </div>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </div>
    </div>
  );
}
