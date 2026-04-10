import { AppProviders } from "@/components/providers/app-providers";
import { SupabaseAuthBoundary } from "@/components/providers/supabase-auth-provider";
import { StairsPageTransitionShell } from "@/components/visuals/transitions/stairs-page-transition-shell";

import { ConversationSessionProvider } from "@/components/chat/conversation-session-provider";
import { AppHeader } from "@/components/app-header/app-header";
import { DashboardSidePanels } from "@/components/sidebar/dashboard-side-panels";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";

export default function McpLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <SupabaseAuthBoundary>
        <ConversationSessionProvider>
          <SidebarProvider defaultOpen={false}>
            <div className="relative flex h-screen w-full flex-col overflow-hidden">
              <AppHeader />
              <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 min-h-0 overflow-hidden bg-background pb-9 sm:pb-7">
                  <StairsPageTransitionShell contentClassName="h-full w-full">
                    {children}
                  </StairsPageTransitionShell>
                </main>
              </div>
              <DashboardSidePanels />
              <DashboardFooter />
            </div>
          </SidebarProvider>
        </ConversationSessionProvider>
      </SupabaseAuthBoundary>
    </AppProviders>
  );
}
