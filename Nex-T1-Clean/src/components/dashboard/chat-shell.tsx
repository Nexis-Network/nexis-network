"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ChatStatus } from "ai";

import { ChatInterface } from "@/components/dashboard/chat-shell/chat-interface";
import { DEFAULT_CHAT_MODEL } from "@/components/dashboard/chat-config";
import { useExpandablePanelState } from "@/components/layout/panels/expandable-panel";
import {
  useActiveArtifact,
  useArtifactPanelState,
  useBurnRateArtifact,
  useMarketTerminalArtifact,
  useTableEditorArtifact,
} from "@/hooks/ai";
import {
  ArtifactRuntimeProvider,
  useArtifactRegistryArtifact,
  useSyncMessageArtifacts,
} from "@/lib/ai/artifact-runtime";
import { AgentWalletsArtifact } from "@/modules/ai/artifacts/agent-wallets";
import { PumpFunV2Artifact } from "@/modules/ai/artifacts/pumpfun-v2";
import { AppOnboardingGuide } from "@/components/onboarding/app-onboarding-guide";
import { useIsMobile } from "@/hooks/ui";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import { withChunkRetry } from "@/components/dashboard/chunk-load-retry";
import { ChatQuickActionsMenu } from "@/components/dashboard/chat-shell/chat-quick-actions-menu";
import { DesktopRightPanel, MobileRightPanel } from "@/components/dashboard/chat-shell/right-panel";
import { DynamicIsland, type DynamicIslandMarketOverview } from "@/components/dynamicIsland";
import { useConversationSession } from "@/components/chat/conversation-session-provider";
import {
  resolveActiveEventFromMessages,
  resolveActiveIdeSessionFromMessages,
  resolveActiveToolFromMessages,
  resolveActiveWorkflowCanvasFromMessages,
} from "@/components/dashboard/chat-shell/helpers/active-tool";
import {
  shouldAutoOpenRightPanel,
} from "@/components/artifacts/right-panel-routing";
import { useAutoOpenRightPanel } from "@/components/artifacts/use-auto-open-right-panel";

const DailyXpPopup = dynamic(
  withChunkRetry(() =>
    import("@/components/xp/daily-xp-popup").then((mod) => ({
      default: mod.DailyXpPopup,
    })),
  ),
  { ssr: false, loading: () => null },
);

function ChatShell() {
  return (
    <ArtifactRuntimeProvider>
      <ChatShellContent />
    </ArtifactRuntimeProvider>
  );
}

function ChatShellContent() {
  const isMobile = useIsMobile();
  const { messages: sessionMessages } = useConversationSession();
  const [, setSelectedChatModel] = useState(DEFAULT_CHAT_MODEL);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("ready");
  const leftPanelState = useExpandablePanelState();
  const burnRateData = useBurnRateArtifact();
  const tableData = useTableEditorArtifact();
  const marketTerminalData = useMarketTerminalArtifact();
  const pumpFunV2Data = useArtifactRegistryArtifact(PumpFunV2Artifact);
  const agentWalletsData = useArtifactRegistryArtifact(AgentWalletsArtifact);

  useSyncMessageArtifacts(sessionMessages);

  // Determine which artifact is active for panel control
  const [activeArtifact, activeArtifactType] = useActiveArtifact([
    { artifact: marketTerminalData, type: "market-terminal" },
    { artifact: pumpFunV2Data, type: "pumpfun-v2" },
    { artifact: tableData, type: "table" },
    { artifact: agentWalletsData, type: "agent_wallets" },
    { artifact: burnRateData, type: "burn_rate" }
  ]);

  const hasUserMessage = useMemo(
    () => sessionMessages.some((message) => message.role === "user"),
    [sessionMessages],
  );
  const activeTool = useMemo(
    () => resolveActiveToolFromMessages(sessionMessages),
    [sessionMessages],
  );
  const activeEvent = useMemo(
    () => resolveActiveEventFromMessages(sessionMessages),
    [sessionMessages],
  );
  const activeIdeSession = useMemo(
    () => resolveActiveIdeSessionFromMessages(sessionMessages),
    [sessionMessages],
  );
  const activeWorkflowCanvas = useMemo(
    () => resolveActiveWorkflowCanvasFromMessages(sessionMessages),
    [sessionMessages],
  );

  const [marketOverview, setMarketOverview] = useState<{
    query: string;
    assets?: string[];
    requestedAt: number;
    visible: boolean;
    mode: MarketIntentAnalysis["mode"];
    confidence: MarketIntentAnalysis["confidence"];
  } | null>(null);

  const rightPanelState = useArtifactPanelState({
    artifact: activeArtifact,
    autoOpenWhen: (artifact) =>
      shouldAutoOpenRightPanel({
        activeTool,
        activeEvent,
        artifactType: activeArtifactType,
        ideSession: activeIdeSession,
        workflowCanvas: activeWorkflowCanvas,
        artifact,
      }),
  });
  const shouldAutoOpenPanel = useMemo(
    () =>
      shouldAutoOpenRightPanel({
        activeTool,
        activeEvent,
        artifactType: activeArtifactType,
        ideSession: activeIdeSession,
        workflowCanvas: activeWorkflowCanvas,
        artifact: activeArtifact,
      }),
    [
      activeArtifact,
      activeArtifactType,
      activeEvent,
      activeIdeSession,
      activeTool,
      activeWorkflowCanvas,
    ],
  );
  useAutoOpenRightPanel({
    panelState: rightPanelState,
    shouldAutoOpen: shouldAutoOpenPanel,
  });

  const handleMarketIntent = useCallback((analysis: MarketIntentAnalysis) => {
    setMarketOverview({
      query: analysis.originalQuery || analysis.focusQuery,
      assets: analysis.assets?.length ? analysis.assets : undefined,
      requestedAt: Date.now(),
      visible: true,
      mode: analysis.mode,
      confidence: analysis.confidence,
    });
  }, []);

  const handleDismissMarketOverview = useCallback(() => {
    setMarketOverview((prev) => (prev ? { ...prev, visible: false } : prev));
  }, []);

  const islandMarketOverview = useMemo<DynamicIslandMarketOverview | null>(() => {
    if (!marketOverview) return null;
    return {
      query: marketOverview.query,
      assets: marketOverview.assets,
      visible: marketOverview.visible,
    };
  }, [marketOverview]);

  return (
    <>
      <Suspense fallback={null}>
        <DailyXpPopup />
      </Suspense>
      <DashboardShell
        insetClassName="overflow-hidden bg-[#1f1f20] px-[10px] pb-[34px] pt-[6px]"
        rightPanel={
          <>
            <DesktopRightPanel
              isMobile={isMobile}
              rightPanelState={rightPanelState}
              leftPanelState={leftPanelState}
              marketOverview={marketOverview}
              onDismissMarketOverview={handleDismissMarketOverview}
              artifactType={activeArtifactType}
              activeTool={activeTool}
              activeEvent={activeEvent}
              ideSession={activeIdeSession}
              workflowCanvas={activeWorkflowCanvas}
            />
             <MobileRightPanel
              isMobile={isMobile}
              rightPanelState={rightPanelState}
              leftPanelState={leftPanelState}
              marketOverview={marketOverview}
              onDismissMarketOverview={handleDismissMarketOverview}
              artifactType={activeArtifactType}
              activeTool={activeTool}
              activeEvent={activeEvent}
              ideSession={activeIdeSession}
              workflowCanvas={activeWorkflowCanvas}
            />
          </>
        }
      >
        <div className="relative flex h-full w-full flex-col gap-[6px] overflow-hidden">
          <DynamicIsland
            chatStatus={chatStatus}
            hasUserMessage={hasUserMessage}
            activeTool={activeTool}
            marketOverview={islandMarketOverview}
          />

          <ChatQuickActionsMenu />

          <div className="relative z-10 flex min-h-0 flex-1 rounded-[30px] bg-[#121212]">
            <ChatErrorBoundary>
              <ChatInterface
                rightPanelState={rightPanelState}
                onMarketIntent={handleMarketIntent}
                onSelectedModelChange={setSelectedChatModel}
                onChatStatusChange={setChatStatus}
              />
            </ChatErrorBoundary>
          </div>
        </div>
      </DashboardShell>


      <AppOnboardingGuide />

    </>
  );
}

export { ChatShell };
export default ChatShell;
