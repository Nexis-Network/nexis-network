"use client";

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import DashboardNavigation, { type Route as DashboardNavigationRoute } from "@/components/navigation/nav-main";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "@/components/providers/locale-provider";
import { useAuthStatus } from "@/hooks/user/use-auth-status";
import { AUTH_IDENTIFIER_EVENT, getStoredAuthIdentifier } from "@/lib/auth-profile";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { useAuthenticatedShellDataOptional } from "@/lib/hooks/user/authenticated-shell-data";
import { dashboardRoutes } from "@/components/navigation/dashboard-routes";
import {
  ConversationHistoryOverlayLazy,
  TasksSidebarOverlayLazy,
  WalletsSidebarFlyoutLazy,
} from "@/components/sidebar/lazy-sidebar-overlays";
import { useConversationSession } from "@/components/chat/conversation-session-provider";
import { useSidebarStore } from "@/stores/use-sidebar-store";
import { trackAgentEvent } from "@/modules/analytics/events";

type SidebarPanel = "chatHistory" | "tasks" | "wallets";

const PANEL_ROUTE_LOOKUP: Record<SidebarPanel, string> = {
  chatHistory: "chat-history",
  tasks: "tasks",
  wallets: "wallets",
};

const ROUTE_TO_PANEL: Partial<Record<string, SidebarPanel>> = {
  "chat-history": "chatHistory",
  tasks: "tasks",
  wallets: "wallets",
};

export function DashboardSidebar() {
  const { state, isMobile } = useSidebar();
  const { data: auth } = useAuthStatus();
  const shellData = useAuthenticatedShellDataOptional();
  const t = useTranslations("app");
  const [mounted, setMounted] = useState(false);
  const [identifier, setIdentifier] = useState<string | null>(null);
  const { activePanel, togglePanel, closePanel } = useSidebarStore();
  const isCollapsed = state === "collapsed" && !isMobile;

  const {
    currentConversationId,
    loadConversationIntoChat,
    startFreshConversation,
  } = useConversationSession();
  const profileQuery = useProfileAggregate({
    enabled: shellData ? false : undefined,
  });
  const profileData = shellData?.profileData ?? profileQuery.data;
  const profileBadgeLabel = useMemo(() => {
    const name =
      profileData?.identity?.ensName ??
      profileData?.identity?.displayName ??
      profileData?.identity?.username ??
      identifier ??
      (auth?.user ? "User" : "Guest");
    const normalized = typeof name === "string" ? name.trim() : "";
    if (!normalized.length) {
      return auth?.user ? "NX" : "NT";
    }
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    const cleaned = normalized.replace(/[^a-zA-Z0-9]/g, "");
    const abbrev = (cleaned || normalized).slice(0, 2).toUpperCase();
    return abbrev || (auth?.user ? "NX" : "NT");
  }, [
    auth?.user,
    identifier,
    profileData?.identity?.displayName,
    profileData?.identity?.ensName,
    profileData?.identity?.username,
  ]);

  const activeRouteId = activePanel && activePanel !== "wallets" ? PANEL_ROUTE_LOOKUP[activePanel] : null;

  const handleRouteClick = useCallback((routeId: string) => {
    const panel = ROUTE_TO_PANEL[routeId] ?? null;
    if (!panel) {
      closePanel();
      return;
    }
    togglePanel(panel);
    trackAgentEvent("sidebar_panel_toggle", {
      panel,
      nextState: activePanel === panel ? "closed" : "open",
    });
  }, [activePanel, closePanel, togglePanel]);

  const closeActivePanel = useCallback(() => {
    closePanel();
  }, [closePanel]);

  const navigationRoutes = useMemo<DashboardNavigationRoute[]>(
    () =>
      dashboardRoutes.map((route) => {
        const isRoute = (route.variant ?? "route") === "route";
        const localizedTitle = (() => {
          switch (route.id) {
            case "chat":
              return t("shell.chat");
            case "screener":
              return t("sidebar.screener");
            case "chat-history":
              return t("shell.chatHistory");
            case "tasks":
              return t("shell.tasks");
            case "portfolio":
              return t("shell.portfolio");
            case "ai-arena":
              return t("sidebar.aiArena");
            case "leaderboard":
              return t("sidebar.walletLeaderboard");
            case "settings":
              return t("sidebar.settings");
            default:
              return route.title;
          }
        })();

        return {
          ...route,
          title: localizedTitle,
          subs: route.subs?.map((subRoute) => ({
            ...subRoute,
            title: (() => {
              switch (subRoute.link) {
                case "/ai-leaderboard":
                  return t("sidebar.aiLeaderboard");
                case "/marketplace":
                  return t("sidebar.marketplace");
                case "/launches":
                  return t("sidebar.launches");
                case "/agents":
                  return t("sidebar.agents");
                case "/settings/agents":
                  return t("sidebar.myAgents");
                case "/agents/new":
                  return t("sidebar.createAgent");
                case "/agents/strategy-lab":
                  return t("sidebar.strategyBuilder");
                default:
                  return subRoute.title;
              }
            })(),
          })),
          onClick: isRoute ? closeActivePanel : route.onClick,
        };
      }),
    [closeActivePanel, t],
  );

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => {
      const stored = getStoredAuthIdentifier();
      setIdentifier(stored?.value ?? null);
    };

    update();
    if (typeof window !== "undefined") {
      window.addEventListener(AUTH_IDENTIFIER_EVENT, update);
      return () => window.removeEventListener(AUTH_IDENTIFIER_EVENT, update);
    }
  }, []);

  if (!mounted) {
    // Return a placeholder during SSR
    return (
      <Sidebar 
          variant="inset" 
          collapsible="icon" 
          data-onboarding-id="app-sidebar"
          style={{ top: '2.85rem', height: 'calc(100svh - 2.85rem)' }}
      >
        <SidebarHeader className="flex md:pt-2.5" />
      </Sidebar>
    );
  }

  return (
    <>
    <Sidebar 
        variant="inset" 
        collapsible="icon" 
        data-onboarding-id="app-sidebar" 
        className="border-r border-border/40"
        style={{ top: '2.85rem', height: 'calc(100svh - 2.85rem)' }}
      >

      <SidebarHeader className="flex px-4 pb-2 pt-4 md:pt-2.5 group-data-[collapsible=icon]:px-2">
        {isMobile && (
           <div className="flex items-center justify-between">
              <span className="text-lg font-bold tracking-tight px-2">{t("sidebar.brand")}</span>
           </div>
        )}
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2 pb-4 pt-2.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pb-4 group-data-[collapsible=icon]:pt-2.5">
        <DashboardNavigation
          routes={navigationRoutes}
          onRouteClick={handleRouteClick}
          activeRouteId={activeRouteId}
        />
      </SidebarContent>
      <SidebarFooter className="space-y-2 px-4 pb-2 pt-2 md:pb-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pb-4">
        {isCollapsed ? (
          <div className="flex justify-center py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-[0.65rem] font-semibold uppercase tracking-wide text-foreground">
              {profileBadgeLabel}
            </div>
          </div>
        ) : (
            <div className="flex justify-start">
              <ThemeToggle />
            </div>
        )}
      </SidebarFooter>
    </Sidebar>

    <ConversationHistoryOverlayLazy
      isOpen={activePanel === "chatHistory"}
      onClose={closeActivePanel}
      currentConversationId={currentConversationId}
      onSelectConversation={async (id) => {
        await loadConversationIntoChat(id);
      }}
      onNewConversation={() => {
        trackAgentEvent("conversation_started", { source: "history_overlay" });
        startFreshConversation();
      }}
    />
    <TasksSidebarOverlayLazy isOpen={activePanel === "tasks"} onClose={closeActivePanel} />
    <WalletsSidebarFlyoutLazy isOpen={activePanel === "wallets"} onClose={closeActivePanel} />
</>

  );
}
