"use client";

import { WorkflowCanvas } from "@/components/ai-elements/workflow-canvas";
import { SandboxWorkbench } from "@/components/artifacts/sandbox-workbench";
import { NativeIdeWorkbench } from "@/components/artifacts/native-ide-workbench";
import { MobileIdeWorkbench } from "@/components/artifacts/mobile-ide-workbench";
import { TableArtifact } from "@/components/artifacts/table-artifact";
import { AgentWalletArtifact } from "@/components/artifacts/agent-wallet-artifact";
import { AgentDaosArtifact } from "@/components/artifacts/features/analysis/agent-daos-artifact";
import {
  DaoProposalsArtifactPanel,
  DaoTreasuryArtifactPanel,
  DaoWorkspaceArtifactPanel,
} from "@/components/artifacts/features/analysis/dao-workspace-artifact";
import { MarketTerminalArtifactPanel } from "@/components/artifacts/features/market/market-terminal-artifact";
import { PumpFunV2ArtifactPanel } from "@/components/artifacts/features/trading/pump-fun-v2-artifact";
import { BurnRateAnalysisPanel } from "@/components/analytics/burn-rate-analysis-panel";
import { RightPanelEmptyState } from "@/components/artifacts/right-panel-empty-state";
import type { AIEvent } from "@/lib/schema";
import {
  isDedicatedWorkflowCanvas,
  type RightPanelMode,
} from "@/components/artifacts/right-panel-routing";
import { renderActiveEventContent } from "@/components/artifacts/right-panel-inline-event-content";
import { renderActiveToolContent } from "@/components/artifacts/right-panel-inline-tool-content";
import type {
  NativeIdeSessionData,
  NativeWorkflowCanvasData,
} from "@/modules/chat/ui-message-parts";
import { hasRenderableIdeSessionSurface } from "@/modules/chat/ui-message-parts";
import type { AgentDaosArtifactData } from "@/modules/ai/artifacts/agent-daos";
import type { DaoProposalsArtifactData } from "@/modules/ai/artifacts/dao-proposals";
import type { DaoTreasuryArtifactData } from "@/modules/ai/artifacts/dao-treasury";
import type { DaoWorkspaceArtifactData } from "@/modules/ai/artifacts/dao-workspace";

type RightPanelContentProps = {
  panelMode: RightPanelMode;
  activeTool?: UntypedJson | null;
  activeEvent?: AIEvent | null;
  ideSession?: NativeIdeSessionData | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
  marketOverviewVisible?: boolean;
  loading?: boolean;
  wallets?: UntypedJson[];
  daoDirectory?: AgentDaosArtifactData | null;
  daoWorkspace?: DaoWorkspaceArtifactData | null;
  daoProposals?: DaoProposalsArtifactData | null;
  daoTreasury?: DaoTreasuryArtifactData | null;
  onOpenBurnRateChart: () => void;
  onCollapsePanel?: () => void;
  viewport?: "desktop" | "phone" | "tablet";
  onImmersiveChange?: (immersive: boolean) => void;
};

export function RightPanelContent({
  panelMode,
  activeTool,
  activeEvent,
  ideSession,
  workflowCanvas,
  marketOverviewVisible = false,
  loading = false,
  wallets = [],
  daoDirectory = null,
  daoWorkspace = null,
  daoProposals = null,
  daoTreasury = null,
  onOpenBurnRateChart,
  onCollapsePanel,
  viewport = "desktop",
  onImmersiveChange,
}: RightPanelContentProps) {
  if (hasRenderableIdeSessionSurface(ideSession)) {
    return (
      viewport === "desktop" ? (
        <NativeIdeWorkbench
          key={ideSession.artifactId ?? ideSession.sandboxId ?? ideSession.title ?? "ide-session"}
          session={ideSession}
          className="h-full"
        />
      ) : (
        <MobileIdeWorkbench
          key={ideSession.artifactId ?? ideSession.sandboxId ?? ideSession.title ?? "ide-session"}
          session={ideSession}
          viewport={viewport}
          className="h-full"
          onImmersiveChange={onImmersiveChange}
        />
      )
    );
  }

  if (panelMode === "workbench") {
    return (
      <SandboxWorkbench
        activeTool={activeTool}
        activeEvent={activeEvent}
        loading={loading}
        onCollapsePanel={onCollapsePanel}
        viewport={viewport}
        onImmersiveChange={onImmersiveChange}
      />
    );
  }

  if (isDedicatedWorkflowCanvas(workflowCanvas)) {
    return (
      <WorkflowCanvas
        title={workflowCanvas.title}
        nodes={workflowCanvas.nodes}
        edges={workflowCanvas.edges}
        className="h-full"
      />
    );
  }

  const toolContent = renderActiveToolContent(activeTool);
  if (toolContent) return toolContent;

  const eventContent = renderActiveEventContent(activeEvent);
  if (eventContent) return eventContent;

  switch (panelMode) {
    case "table":
      return <TableArtifact />;
    case "market_terminal":
      return <MarketTerminalArtifactPanel />;
    case "agent_wallets":
      return <AgentWalletArtifact data={{ wallets }} />;
    case "agent_daos":
      return daoDirectory ? <div className="p-4"><AgentDaosArtifact data={daoDirectory} /></div> : <RightPanelEmptyState loading={loading} />;
    case "dao_workspace":
      return <DaoWorkspaceArtifactPanel data={daoWorkspace} />;
    case "dao_proposals":
      return <DaoProposalsArtifactPanel data={daoProposals} />;
    case "dao_treasury":
      return <DaoTreasuryArtifactPanel data={daoTreasury} />;
    case "burn_rate":
      return <BurnRateAnalysisPanel onOpenChart={onOpenBurnRateChart} />;
    case "pumpfun_v2":
      return <PumpFunV2ArtifactPanel />;
    default:
      if (marketOverviewVisible) {
        return null;
      }
      return <RightPanelEmptyState loading={loading} />;
  }
}
