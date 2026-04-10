"use client";

import { ReactNode } from "react";
import { Provider as ChatStoreProvider } from "@ai-sdk-tools/store";
import { AppHeader } from "@/components/app-header/app-header";
import { cn } from "@/lib/utils";
import { ConversationSessionProvider } from "@/components/chat/conversation-session-provider";
import { DashboardSidePanels } from "@/components/sidebar/dashboard-side-panels";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";

type DashboardShellProps = {
  children: ReactNode;
  insetClassName?: string;
  rightPanel?: ReactNode;
};

export function DashboardShell({ children, insetClassName, rightPanel }: DashboardShellProps) {
  return (
    <ChatStoreProvider>
      <ConversationSessionProvider>
        <SidebarProvider defaultOpen={false}>
          <div className="relative flex h-screen w-full flex-col overflow-hidden">
            <AppHeader />
            <div className="flex flex-1 overflow-hidden">
              <main
                className={cn(
                  "flex-1 min-h-0 overflow-hidden bg-background pb-9 sm:pb-7",
                  insetClassName,
                )}
              >
                {children}
              </main>
              {rightPanel}
            </div>
            <DashboardSidePanels />
            <DashboardFooter />
          </div>
        </SidebarProvider>
      </ConversationSessionProvider>
    </ChatStoreProvider>
  );
}
