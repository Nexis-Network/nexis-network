"use client";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type React from "react";

import DashboardNavigation, { type Route } from "@/components/sidebar-03/nav-main";
import { Logo } from "@/components/sidebar-03/logo";
import { NotificationsPopover } from "@/components/sidebar-03/nav-notifications";
import { TeamSwitcher } from "@/components/sidebar-03/team-switcher";

type DashboardSidebarProps = {
  routes?: Route[];
  logo?: React.ReactNode;
  footer?: React.ReactNode;
};

const defaultRoutes: Route[] = [];

const defaultNotifications = [
  { id: "1", avatar: "", fallback: "NX", text: "All systems healthy.", time: "now" },
];

const defaultTeams = [{ id: "1", name: "Nexis", logo: Logo, plan: "Core" }];

export function DashboardSidebar({ routes = defaultRoutes, logo, footer }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader
        className={cn(
          "flex md:pt-3.5",
          isCollapsed
            ? "flex-row items-center justify-between gap-y-4 md:flex-col md:items-start md:justify-start"
            : "flex-row items-center justify-between",
        )}
      >
        <a href="#" className="flex items-center gap-2">
          {logo ?? <Logo className="h-8 w-8" />}
          {!isCollapsed ? <span className="font-semibold text-black dark:text-white">Nexis</span> : null}
        </a>

        <motion.div
          key={isCollapsed ? "header-collapsed" : "header-expanded"}
          className={cn("flex items-center gap-2", isCollapsed ? "flex-row md:flex-col-reverse" : "flex-row")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <NotificationsPopover notifications={defaultNotifications} />
          <SidebarTrigger />
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2 py-4">
        <DashboardNavigation routes={routes} />
      </SidebarContent>

      <SidebarFooter className="px-2">{footer ?? <TeamSwitcher teams={defaultTeams} />}</SidebarFooter>
    </Sidebar>
  );
}
