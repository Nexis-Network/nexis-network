import type { RightPanelMode } from "@/components/artifacts/right-panel-routing";
import type { UseArtifactPanelStateReturn } from "@/hooks/ai";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";

type ShouldHideAppDashboardFooterArgs = {
  activeRightPanelMode: RightPanelMode;
  openedDocumentId?: string | null;
  rightPanelIsCollapsed: boolean;
  rightPanelIsOpen: boolean;
};

export function shouldHideAppDashboardFooter({
  activeRightPanelMode: _activeRightPanelMode,
  openedDocumentId,
  rightPanelIsCollapsed,
  rightPanelIsOpen,
}: ShouldHideAppDashboardFooterArgs): boolean {
  return (rightPanelIsOpen && !rightPanelIsCollapsed) || Boolean(openedDocumentId);
}

type ShouldMaintainDesktopWorkspaceInsetArgs = {
  rightPanelIsVisible: boolean;
};

export function shouldMaintainDesktopWorkspaceInset({
  rightPanelIsVisible,
}: ShouldMaintainDesktopWorkspaceInsetArgs): boolean {
  return rightPanelIsVisible;
}

export type DesktopArtifactPanelSizing = {
  autoSaveId: string;
  chatDefaultSize: number;
  chatMinSize: number;
  panelDefaultSize: number;
  panelMaxSize: number;
  panelMinSize: number;
};

export type AppChatWorkspaceProps = {
  addConversationLeftInset: boolean;
  onMarketIntent: (analysis: MarketIntentAnalysis) => void;
  rightPanelState: UseArtifactPanelStateReturn;
  shouldHideFooter: boolean;
  useExpandedConversationWidth: boolean;
};

export const APP_CHAT_SHELL_CHROME_POSITIONS = {
  ethPrice:
    "absolute bottom-[var(--auth-shell-padding-x)] left-[var(--auth-shell-padding-x)] z-40 hidden md:flex",
  gasPrice:
    "absolute bottom-[var(--auth-shell-padding-x)] right-[var(--auth-shell-padding-x)] z-40 hidden md:flex",
  sidebarToggle:
    "absolute left-[var(--auth-shell-padding-x)] top-[var(--auth-shell-padding-x)] z-40",
  walletSelect:
    "absolute right-[var(--auth-shell-padding-x)] top-[var(--auth-shell-padding-x)] z-40",
} as const;

export function getDesktopArtifactPanelSizing(): DesktopArtifactPanelSizing {
  return {
    autoSaveId: "app-chat-desktop-panels",
    chatDefaultSize: 64,
    chatMinSize: 44,
    panelDefaultSize: 36,
    panelMinSize: 24,
    panelMaxSize: 56,
  };
}
