"use client";

import type { ComponentProps, CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { NavFooter } from "@/components/sidebar-01/nav-footer";
import { DocsAudienceSwitcher } from "@/components/sidebar-01/docs-audience-switcher";
import { DocsSidebarPanel } from "@/components/sidebar-01/docs-sidebar-panel";
import { DocsSidebarPrimaryNav } from "@/components/sidebar-01/docs-sidebar-primary-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  audienceContainsPath,
  DOCS_AUDIENCE_OPTIONS,
  getDocsAudienceForPath,
  getDocsAudienceNavigation,
  getDocsCategory,
  getDocsCategoryForPath,
  type DocsAudienceId,
} from "@/modules/docs/sidebar-navigation";

const PRIMARY_SIDEBAR_STYLE = {
  "--sidebar-width": "17rem",
} as CSSProperties;
const PRIMARY_SIDEBAR_WIDTH = "17rem";
const SECONDARY_SIDEBAR_WIDTH = "20rem";

const PRIMARY_SIDEBAR_CLASSNAME =
  "border-r border-white/6 text-[#ededed] [&_[data-slot=sidebar-inner]]:bg-[#181818] [&_[data-slot=sidebar-inner]]:backdrop-blur-none [&_[data-slot=sidebar-rail]]:hidden";
const HOVER_CLOSE_DELAY_MS = 120;

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname() ?? "/docs";
  const { isMobile, open } = useSidebar();
  const initialAudienceId = getDocsAudienceForPath(pathname);
  const [activeAudienceId, setActiveAudienceId] =
    useState<DocsAudienceId>(initialAudienceId);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(() =>
    getDocsCategoryForPath(initialAudienceId, pathname),
  );
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setHoveredCategoryId(null);
      hideTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    if (audienceContainsPath(activeAudienceId, pathname)) {
      setActiveCategoryId(getDocsCategoryForPath(activeAudienceId, pathname));
      setHoveredCategoryId(null);
      return;
    }

    setActiveCategoryId(
      getDocsAudienceNavigation(activeAudienceId).groups[0]?.categories[0]?.id ??
        "",
    );
    setHoveredCategoryId(null);
  }, [activeAudienceId, pathname]);

  useEffect(() => () => clearHideTimer(), []);

  const activeAudience = getDocsAudienceNavigation(activeAudienceId);
  const activeCategory = getDocsCategory(activeAudienceId, activeCategoryId);
  const hoveredCategory = hoveredCategoryId
    ? getDocsCategory(activeAudienceId, hoveredCategoryId)
    : null;
  const popoutCategory = isMobile ? activeCategory : hoveredCategory;

  return (
    <>
      <Sidebar
        {...props}
        collapsible="offcanvas"
        style={PRIMARY_SIDEBAR_STYLE}
        className={cn(PRIMARY_SIDEBAR_CLASSNAME, props.className)}
      >
        <SidebarHeader className="gap-3 px-3 py-3">
          <DocsAudienceSwitcher
            audiences={DOCS_AUDIENCE_OPTIONS}
            activeAudienceId={activeAudienceId}
            onSelect={setActiveAudienceId}
          />
        </SidebarHeader>

        <SidebarContent className="px-3 py-3">
          <div
            onMouseEnter={() => {
              if (!isMobile) {
                clearHideTimer();
              }
            }}
            onMouseLeave={() => {
              if (!isMobile) {
                scheduleHoverClose();
              }
            }}
          >
            <DocsSidebarPrimaryNav
              groups={activeAudience.groups}
              activeCategoryId={activeCategoryId}
              hoveredCategoryId={hoveredCategoryId}
              isMobile={isMobile}
              pathname={pathname}
              onCategoryHover={(categoryId) => {
                clearHideTimer();
                setHoveredCategoryId(categoryId);
              }}
              onCategorySelect={setActiveCategoryId}
            />
          </div>

          {isMobile && activeCategory ? (
            <div className="mt-5 border-t border-white/6 pt-4">
              <DocsSidebarPanel
                audience={activeAudience}
                category={activeCategory}
                pathname={pathname}
              />
            </div>
          ) : null}
        </SidebarContent>

        <NavFooter />
      </Sidebar>

      {!isMobile && open && popoutCategory ? (
        <aside
          className="fixed z-30 hidden border-r border-white/6 bg-[#181818] md:flex"
          onMouseEnter={clearHideTimer}
          onMouseLeave={scheduleHoverClose}
          style={{
            left: PRIMARY_SIDEBAR_WIDTH,
            top: "var(--docs-header-offset)",
            width: SECONDARY_SIDEBAR_WIDTH,
            height: "calc(var(--docs-shell-height) - var(--docs-header-offset))",
          }}
        >
          <DocsSidebarPanel
            audience={activeAudience}
            category={popoutCategory}
            pathname={pathname}
          />
        </aside>
      ) : null}
    </>
  );
}
