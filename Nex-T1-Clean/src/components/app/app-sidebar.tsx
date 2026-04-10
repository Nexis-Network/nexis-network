"use client";

import { useConversationSession } from "@/components/chat/conversation-session-provider";
import { useTranslations } from "@/components/providers/locale-provider";
import { useSidebarStore } from "@/stores/use-sidebar-store";
import { trackAgentEvent } from "@/modules/analytics/events";
import { cn } from "@/lib/utils";
import { appShellClasses } from "@/components/app/app-shell-primitives";
import { ChatHistoryIcon, NewMessageIcon, TasksIcon } from "@/components/app/app-screen-icons";

/**
 * AppSidebar
 * Matches Figma "navigation-sidebar-menu"
 * - Width: 50px
 * - Height: 877px (or fit container)
 * - Padding: 292px 6px
 * - Gap: 10px
 * - Border Radius: 30px
 * - Icons: New Chat, History, Tasks
 */

export function AppSidebar() {
  const { activePanel, togglePanel, closePanel } = useSidebarStore();
  const { startFreshConversation } = useConversationSession();
  const t = useTranslations("app");

  const handleNewConversation = () => {
    closePanel();
    startFreshConversation();
    trackAgentEvent("conversation_started", { source: "app_sidebar" });
  };

  const handleTogglePanel = (panel: "chatHistory" | "tasks") => {
    togglePanel(panel);
    trackAgentEvent("sidebar_panel_toggle", {
      panel,
      nextState: activePanel === panel ? "closed" : "open",
      source: "app_sidebar",
    });
  };

  return (
    <div className={appShellClasses.sidebarRail}>
        <div className={appShellClasses.sidebarStack}>
            
            <SidebarIconButton
                label={t("shell.newConversation")}
                onClick={handleNewConversation}
                isActive={false}
            >
                <NewMessageIcon className="size-4" alt="" />
            </SidebarIconButton>

            <SidebarIconButton
                label={t("shell.chatHistory")}
                onClick={() => handleTogglePanel("chatHistory")}
                isActive={activePanel === "chatHistory"}
            >
                <ChatHistoryIcon className="size-4" alt="" />
            </SidebarIconButton>

            <SidebarIconButton
                label={t("shell.tasks")}
                onClick={() => handleTogglePanel("tasks")}
                isActive={activePanel === "tasks"}
            >
                <TasksIcon className="size-4" alt="" />
            </SidebarIconButton>

        </div>
    </div>
  );
}

function SidebarIconButton({
    label,
    onClick,
    isActive,
    children
}: {
    label: string;
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
                appShellClasses.sidebarButton,
                isActive && "text-[var(--auth-sidebar-button-hover-fg)]",
            )}
        >
            {children}
        </button>
    )
}
