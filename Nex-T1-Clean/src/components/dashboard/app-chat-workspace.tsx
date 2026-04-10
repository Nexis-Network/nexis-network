"use client";

import dynamic from "next/dynamic";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import { AppSidebarToggle } from "@/components/app/app-sidebar-toggle";
import {
  ChatEthPricePill,
  ChatGasPricePill,
} from "@/components/dashboard/chat-shell/chat-price-pills";
import { ChatWalletSelect } from "@/components/dashboard/chat-shell/chat-wallet-select";
import { ChatInterface } from "@/components/dashboard/chat-shell/chat-interface";
import {
  APP_CHAT_SHELL_CHROME_POSITIONS,
  type AppChatWorkspaceProps,
} from "@/components/dashboard/app-chat-shell-layout";
import { appShellClasses } from "@/components/app/app-shell-primitives";
import { cn } from "@/lib/utils";

const DashboardFooter = dynamic(
  () =>
    import("@/components/dashboard/DashboardFooter").then((module) => ({
      default: module.DashboardFooter,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[34px] w-full items-center justify-center bg-transparent px-[10px]" />
    ),
  },
);

export function AppChatWorkspace({
  addConversationLeftInset,
  onMarketIntent,
  rightPanelState,
  shouldHideFooter,
  useExpandedConversationWidth,
}: AppChatWorkspaceProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden p-1 md:gap-[var(--auth-shell-gap)]">
      <section
        aria-label="Conversation workspace"
        className={cn(appShellClasses.workspaceSurface, "relative")}
      >
        <AppSidebarToggle className={APP_CHAT_SHELL_CHROME_POSITIONS.sidebarToggle} />
        <ChatWalletSelect className={APP_CHAT_SHELL_CHROME_POSITIONS.walletSelect} />
        <div className={cn("pointer-events-none", APP_CHAT_SHELL_CHROME_POSITIONS.ethPrice)}>
          <div className="pointer-events-auto">
            <ChatEthPricePill />
          </div>
        </div>
        <div className={cn("pointer-events-none", APP_CHAT_SHELL_CHROME_POSITIONS.gasPrice)}>
          <div className="pointer-events-auto">
            <ChatGasPricePill />
          </div>
        </div>
        <ChatErrorBoundary>
          <ChatInterface
            addConversationLeftInset={addConversationLeftInset}
            layoutVariant="app"
            onMarketIntent={onMarketIntent}
            rightPanelState={rightPanelState}
            useExpandedConversationWidth={useExpandedConversationWidth}
          />
        </ChatErrorBoundary>
      </section>

      <div className="flex-none">
        {!shouldHideFooter ? (
          <DashboardFooter />
        ) : (
          <div
            aria-hidden="true"
            className="hidden h-[34px] w-full md:block"
          />
        )}
      </div>
    </div>
  );
}
