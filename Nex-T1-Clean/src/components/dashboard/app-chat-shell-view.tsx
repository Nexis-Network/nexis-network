"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { ConversationSessionProvider } from "@/components/chat/conversation-session-provider";
import { AppPageShell } from "@/components/app/app-page-shell";
import { AppHeader } from "@/components/app-header/app-header";
import { preloadRightPanelArtifact } from "@/components/artifacts/right-panel-artifact-loader";
import { AppChatWorkspace } from "@/components/dashboard/app-chat-workspace";
import { DesktopWorkspaceLayout } from "@/components/dashboard/chat-shell/desktop-workspace-layout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const AppSidebar = dynamic(
  () => import("@/components/app/app-sidebar").then((m) => ({ default: m.AppSidebar })),
  { ssr: false, loading: () => <div className="hidden md:block w-[var(--auth-sidebar-shell-width)]" /> },
);

const DesktopRightPanel = dynamic(
  () => import("@/components/dashboard/chat-shell/right-panel").then((m) => ({ default: m.DesktopRightPanel })),
  { ssr: false, loading: () => null },
);

const MobileRightPanel = dynamic(
  () => import("@/components/dashboard/chat-shell/right-panel").then((m) => ({ default: m.MobileRightPanel })),
  { ssr: false, loading: () => null },
);

import { useAppChatShellState } from "./app-chat-shell-state";
import { resolveInitialConversationId } from "./app-chat-shell-view.utils";

const AppOnboardingGuide = dynamic(
  () =>
    import("@/components/onboarding/app-onboarding-guide").then((module) => ({
      default: module.AppOnboardingGuide,
    })),
  { ssr: false, loading: () => null },
);

const AppChatShellPopups = dynamic(
  () =>
    import("./app-chat-shell-popups").then((module) => ({
      default: module.AppChatShellPopups,
    })),
  { ssr: false, loading: () => null },
);

const DashboardSidePanels = dynamic(
  () =>
    import("@/components/sidebar/dashboard-side-panels").then((module) => ({
      default: module.DashboardSidePanels,
    })),
  { ssr: false, loading: () => null },
);

function AppChatShellInner() {
  const state = useAppChatShellState();
  const desktopArtifactOpen =
    !state.isMobile && state.isDesktopArtifactPanelVisible;

  useEffect(() => {
    let cancelled = false;
    const preload = () => {
      if (!cancelled) {
        preloadRightPanelArtifact();
      }
    };

    const shouldPreloadImmediately =
      Boolean(
        state.activeArtifactType ||
          state.activeTool ||
          state.activeEvent ||
          state.activeIdeSession ||
          state.activeWorkflowCanvas ||
          state.rightPanelState.isOpen,
      ) ||
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true;

    if (shouldPreloadImmediately) {
      preload();
      return () => {
        cancelled = true;
      };
    }

    const timeoutId = window.setTimeout(preload, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    state.activeArtifactType,
    state.activeEvent,
    state.activeIdeSession,
    state.activeTool,
    state.activeWorkflowCanvas,
    state.rightPanelState.isOpen,
  ]);

  return (
    <SidebarProvider
      open={state.isSidebarOpen}
      onOpenChange={state.setIsSidebarOpen}
    >
      <AppChatShellPopups
        isReleasePopupVisible={state.isReleasePopupVisible}
        onReleasePopupVisibilityChange={state.setIsReleasePopupVisible}
      />
      <AppPageShell
        header={<AppHeader />}
        sidebar={<AppSidebar />}
        sidePanels={<DashboardSidePanels />}
        maintainRightInset={state.shouldMaintainDesktopRightSpacing}
      >
        <div
          className={cn(
            "relative flex h-full min-w-0 w-full flex-col overflow-hidden",
            state.shouldMaintainDesktopRightSpacing
              ? "md:gap-[var(--auth-shell-gap)]"
              : "md:gap-0",
          )}
        >
          {!state.isMobile ? (
            <DesktopWorkspaceLayout
              className="min-h-0 flex-1"
              chatPanel={
                <AppChatWorkspace
                  addConversationLeftInset={
                    state.shouldAddConversationLeftInset
                  }
                  onMarketIntent={state.handleMarketIntent}
                  rightPanelState={state.rightPanelState}
                  shouldHideFooter={state.shouldHideFooter}
                  useExpandedConversationWidth={
                    !state.isSidebarOpen && !state.isDesktopArtifactPanelVisible
                  }
                />
              }
              rightPanel={
                <DesktopRightPanel
                  isMobile={state.isMobile}
                  rightPanelState={state.rightPanelState}
                  leftPanelState={state.leftPanelState}
                  marketOverview={state.marketOverview}
                  onDismissMarketOverview={state.handleDismissMarketOverview}
                  artifactType={state.activeArtifactType}
                  activeTool={state.activeTool}
                  activeEvent={state.activeEvent}
                  ideSession={state.activeIdeSession}
                  workflowCanvas={state.activeWorkflowCanvas}
                />
              }
              showRightPanel={desktopArtifactOpen}
            />
          ) : (
            <AppChatWorkspace
              addConversationLeftInset={state.shouldAddConversationLeftInset}
              onMarketIntent={state.handleMarketIntent}
              rightPanelState={state.rightPanelState}
              shouldHideFooter={state.shouldHideFooter}
              useExpandedConversationWidth={
                !state.isSidebarOpen && !state.isDesktopArtifactPanelVisible
              }
            />
          )}
          <MobileRightPanel
            isMobile={state.isMobile}
            rightPanelState={state.rightPanelState}
            leftPanelState={state.leftPanelState}
            marketOverview={state.marketOverview}
            onDismissMarketOverview={state.handleDismissMarketOverview}
            artifactType={state.activeArtifactType}
            activeTool={state.activeTool}
            activeEvent={state.activeEvent}
            ideSession={state.activeIdeSession}
            workflowCanvas={state.activeWorkflowCanvas}
          />
        </div>
      </AppPageShell>

      {!state.isReleasePopupVisible ? <AppOnboardingGuide /> : null}
    </SidebarProvider>
  );
}

export function AppChatShellView() {
  const searchParams = useSearchParams();
  const initialConversationId = resolveInitialConversationId(searchParams);

  return (
    <ConversationSessionProvider initialConversationId={initialConversationId}>
      <AppChatShellInner />
    </ConversationSessionProvider>
  );
}
