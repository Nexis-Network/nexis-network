"use client";

import { useState, type ComponentType } from "react";
import { History, ListTodo, MessageSquarePlus } from "lucide-react";

import { useConversationSession } from "@/components/chat/conversation-session-provider";
import { useTranslations } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import {
  glassSurfaceClass,
  glassSurfaceStyle
} from "@/lib/ui/surface";
import { cn } from "@/lib/utils";
import { trackAgentEvent } from "@/modules/analytics/events";
import type { SidebarPanel } from "@/stores/use-sidebar-store";
import { useSidebarStore } from "@/stores/use-sidebar-store";

type QuickAction = {
  id: "newConversation" | "chatHistory" | "tasks";
  panel: SidebarPanel | null;
  icon: ComponentType<{ className?: string }>;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "newConversation",
    panel: null,
    icon: MessageSquarePlus,
  },
  {
    id: "chatHistory",
    panel: "chatHistory",
    icon: History,
  },
  {
    id: "tasks",
    panel: "tasks",
    icon: ListTodo,
  },
];

export function ChatQuickActionsMenu() {
  const { activePanel, closePanel, setPanel } = useSidebarStore();
  const { startFreshConversation } = useConversationSession();
  const { isMobile } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("app");

  const leftOffset = isMobile ? "12px" : "10px";

  const getActionLabel = (action: QuickAction) => {
    switch (action.id) {
      case "newConversation":
        return t("shell.newConversation");
      case "chatHistory":
        return t("shell.chatHistory");
      case "tasks":
        return t("shell.tasks");
      default:
        return action.id;
    }
  };

  const handleNewConversation = () => {
    closePanel();
    startFreshConversation();
    trackAgentEvent("conversation_started", { source: "quick_actions_menu" });
  };

  const handleOpenPanel = (panel: Exclude<SidebarPanel, "wallets">) => {
    setPanel(panel);
    trackAgentEvent("sidebar_panel_toggle", {
      panel,
      nextState: "open",
      source: "quick_actions_menu",
    });
  };

  const handleAction = (action: QuickAction) => {
    if (action.id === "newConversation") {
      handleNewConversation();
      return;
    }

    if (action.panel === "chatHistory" || action.panel === "tasks") {
      handleOpenPanel(action.panel);
    }
  };

  const actionButtons = QUICK_ACTIONS.map((action) => {
    const Icon = action.icon;
    const isActive = action.panel !== null && activePanel === action.panel;

    return (
      <Button
        key={action.id}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={getActionLabel(action)}
        title={getActionLabel(action)}
        onClick={() => handleAction(action)}
        className={cn(
          "size-9 rounded-full border border-transparent bg-white/5 text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-[#C7C7CC]",
          isActive && "border-primary/40 bg-white/12 text-[#C7C7CC]",
        )}
      >
        <Icon className="size-4" />
      </Button>
    );
  });

  if (isMobile) {
    return (
      <>
        <div className="pointer-events-none fixed z-[70]" style={{ left: leftOffset, bottom: "96px" }}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("quickActions.open")}
            onClick={() => setMobileOpen(true)}
            className={cn(
              glassSurfaceClass,
              "pointer-events-auto size-11 rounded-full border border-white/10 bg-white/5 text-[#A1A1A1] shadow-[0_10px_24px_rgba(8,8,8,0.35)] backdrop-blur-md",
            )}
            style={{ ...glassSurfaceStyle }}
          >
            <ListTodo className="size-5" />
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[88px] border-white/10 bg-[#151515]/90 p-3 backdrop-blur-[6px] [&>button]:right-2 [&>button]:top-2"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("quickActions.title")}</SheetTitle>
              <SheetDescription>{t("quickActions.description")}</SheetDescription>
            </SheetHeader>

            <div className="mt-12 flex w-full flex-col items-center gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                const isActive = action.panel !== null && activePanel === action.panel;

                return (
                  <Button
                    key={action.id}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={getActionLabel(action)}
                    title={getActionLabel(action)}
                    onClick={() => {
                      handleAction(action);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "size-11 rounded-full border border-transparent bg-white/5 text-[#A1A1A1] transition-colors hover:bg-white/10 hover:text-[#C7C7CC]",
                      isActive && "border-primary/40 bg-white/12 text-[#C7C7CC]",
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div
      className="pointer-events-none fixed top-1/2 z-[70] -translate-y-1/2"
      style={{ left: leftOffset }}
    >
      <div
        className={cn(
          glassSurfaceClass,
          "pointer-events-auto flex h-[140px] w-[52px] flex-col gap-2 rounded-[18px] border border-white/10 p-2 text-[#666666] shadow-[0_8px_24px_rgba(8,8,8,0.24)] outline-none backdrop-blur-[6px]",
        )}
        style={{ ...glassSurfaceStyle }}
        role="group"
        aria-label={t("quickActions.title")}
      >
        {actionButtons}
      </div>
    </div>
  );
}
