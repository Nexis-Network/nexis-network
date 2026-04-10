"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuItem as SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState, Fragment } from "react";
import { usePathname } from "next/navigation";
import type { SidebarRoute } from "@/components/navigation/dashboard-routes";

export type Route = SidebarRoute & {
  onClick?: () => void; // Allow custom click handlers
  onHover?: () => void;
};

type DashboardNavigationProps = {
  routes: Route[];
  onRouteClick?: (routeId: string) => void;
  activeRouteId?: string | null;
};

const navItemBaseClassName =
  "group/nav-item flex h-10 w-full items-center rounded-lg px-2.5 transition-[background-color,color,box-shadow,transform,border-radius] duration-200 ease-out hover:rounded-full hover:bg-[var(--auth-sidebar-button-hover-bg)] hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:px-0";

const navItemActiveClassName = "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm";

export default function DashboardNavigation({
  routes,
  onRouteClick: _onRouteClick,
  activeRouteId = null,
}: DashboardNavigationProps) {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;
  const shouldShowText = !isCollapsed || isMobile;
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
  const pathname = usePathname() ?? "";

  return (
    <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:gap-2.5">
      {routes.map((route) => {
        const variant = route.variant ?? "route";
        const hasSubRoutes = variant === "route" && !!route.subs?.length;
        const isOpen = shouldShowText && openCollapsible === route.id;
        const routePaths =
          variant === "route" && route.link
            ? [route.link, ...(route.subs?.map((subRoute) => subRoute.link) ?? [])]
            : [];
        const isRouteActive =
          variant === "route"
            ? routePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
            : route.id === activeRouteId;
        const isTextActive = isOpen || isRouteActive;
        const routeTooltipLabel = route.id === "chat" ? "New chat" : route.title;
        const labelClassName = cn(
          "order-1 z-[1] ml-3 flex h-[20px] min-w-0 items-center whitespace-nowrap text-sm font-medium leading-[20px] transition-[opacity,transform,max-width] duration-200 ease-out",
          shouldShowText ? "max-w-[11rem] translate-x-0 opacity-100" : "pointer-events-none max-w-0 -translate-x-1 opacity-0",
          route.labelClassName,
          isTextActive && "font-semibold",
        );
        const iconNode = route.icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--auth-menu-subtle-bg)] text-[var(--auth-nav-text)] transition-transform duration-200 ease-out group-hover/nav-item:scale-[1.03]">
            {route.icon}
          </span>
        ) : null;

        return (
          <Fragment key={route.id}>
            {route.separator && (
              <SidebarMenuItem key={`${route.id}-separator`}>
                <div className="mx-2 my-1 h-px bg-border/40" />
              </SidebarMenuItem>
            )}
            <SidebarMenuItem key={route.id}>
              {hasSubRoutes && !shouldShowText && route.link ? (
                <SidebarMenuButton tooltip={routeTooltipLabel} asChild data-onboarding-id={route.id}>
                  <Link
                    href={route.link}
                    className={cn(navItemBaseClassName, isRouteActive && navItemActiveClassName)}
                    onClick={() => {
                      route.onClick?.();
                    }}
                    aria-label={routeTooltipLabel}
                  >
                    {iconNode}
                    <span className="sr-only">{routeTooltipLabel}</span>
                  </Link>
                </SidebarMenuButton>
              ) : hasSubRoutes ? (
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open: boolean) => setOpenCollapsible(open ? route.id : null)}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className={cn(navItemBaseClassName, isTextActive && navItemActiveClassName)}
                    >
                      {iconNode}
                      <span className={labelClassName}>{route.title}</span>
                      {shouldShowText && hasSubRoutes && (
                        <span className="ml-auto scale-90 text-sidebar-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180">
                          <ChevronDown className="size-4" />
                        </span>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {shouldShowText && (
                    <CollapsibleContent>
                      <SidebarMenuSub className="my-1 ml-3.5">
                        {route.subs?.map((subRoute) => {
                          const isSubActive =
                            pathname === subRoute.link || pathname.startsWith(`${subRoute.link}/`);
                          return (
                            <SidebarMenuSubItem key={`${route.id}-${subRoute.title}`} className="h-auto">
                              <SidebarMenuSubButton asChild>
                                <Link
                                  href={subRoute.link}
                                  className={cn(
                                    "group/nav-item flex items-center rounded-md px-3 py-1 text-xs font-normal leading-[18px] transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent/80",
                                    isSubActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "order-1 z-[1] flex h-[18px] min-w-[35px] items-center transition-colors",
                                      isSubActive && "font-medium",
                                    )}
                                  >
                                    {subRoute.title}
                                  </span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ) : variant === "route" && route.link ? (
                <SidebarMenuButton tooltip={routeTooltipLabel} asChild data-onboarding-id={route.id}>
                  <Link
                    href={route.link}
                    className={cn(navItemBaseClassName, isRouteActive && navItemActiveClassName)}
                    onClick={() => {
                      route.onClick?.();
                    }}
                    aria-label={routeTooltipLabel}
                  >
                    {iconNode}
                    <span
                      className={cn(
                        "order-1 z-[1] ml-3 flex h-[20px] min-w-0 items-center whitespace-nowrap text-sm font-medium leading-[20px] transition-[opacity,transform,max-width] duration-200 ease-out",
                        shouldShowText
                          ? "max-w-[11rem] translate-x-0 opacity-100"
                          : "pointer-events-none max-w-0 -translate-x-1 opacity-0",
                        route.labelClassName,
                        isRouteActive && "font-semibold",
                      )}
                    >
                      {route.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  tooltip={routeTooltipLabel}
                  onClick={() => {
                    route.onClick?.();
                    _onRouteClick?.(route.id);
                  }}
                  onMouseEnter={() => {
                    if (!isMobile) {
                      route.onHover?.();
                    }
                  }}
                  onFocus={() => {
                    route.onHover?.();
                  }}
                  className={cn(navItemBaseClassName, isRouteActive && navItemActiveClassName)}
                  aria-pressed={isRouteActive}
                  aria-label={routeTooltipLabel}
                  data-variant={variant}
                  data-onboarding-id={route.id}
                >
                  {iconNode}
                  <span
                    className={cn(
                      "order-1 z-[1] ml-3 flex h-[20px] min-w-0 items-center whitespace-nowrap text-sm font-medium leading-[20px] transition-[opacity,transform,max-width] duration-200 ease-out",
                      shouldShowText
                        ? "max-w-[11rem] translate-x-0 opacity-100"
                        : "pointer-events-none max-w-0 -translate-x-1 opacity-0",
                      route.labelClassName,
                      isRouteActive && "font-semibold",
                    )}
                  >
                    {route.title}
                  </span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </Fragment>
        );
      })}
    </SidebarMenu>
  );
}
