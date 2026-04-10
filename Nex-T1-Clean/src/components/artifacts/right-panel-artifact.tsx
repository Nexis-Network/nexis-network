"use client";

import { useEffect, useState } from "react";
import { ExpandablePanel } from "@/components/layout/panels/expandable-panel";
import { RightPanelHeader } from "./right-panel-header";
import {
  useArtifactRegistryArtifact,
  useArtifactRuntime,
} from "@/lib/ai/artifact-runtime";
import { BurnRateArtifact, type BurnRateArtifactData } from "@/lib/burn-rate";
import {
  TableEditorArtifact,
  type TableEditorArtifactData,
} from "@/modules/ai/artifacts/table-editor";
import {
  AgentWalletsArtifact,
  type AgentWalletsArtifactData,
} from "@/modules/ai/artifacts/agent-wallets";
import {
  AgentDaosArtifactRecord,
  type AgentDaosArtifactData,
} from "@/modules/ai/artifacts/agent-daos";
import {
  DaoWorkspaceArtifactRecord,
  type DaoWorkspaceArtifactData,
} from "@/modules/ai/artifacts/dao-workspace";
import {
  DaoProposalsArtifactRecord,
  type DaoProposalsArtifactData,
} from "@/modules/ai/artifacts/dao-proposals";
import {
  DaoTreasuryArtifactRecord,
  type DaoTreasuryArtifactData,
} from "@/modules/ai/artifacts/dao-treasury";
import {
  MarketTerminalArtifact,
  type MarketTerminalArtifactPayload,
} from "@/modules/ai/artifacts/market-terminal";
import {
  PumpFunV2Artifact,
  type PumpFunV2ArtifactData,
} from "@/modules/ai/artifacts/pumpfun-v2";
import { BurnRateChart } from "@/components/dashboard/lazy-components";
import type { RightPanelArtifactProps } from "./types";
import { CrossChainOverviewCard } from "@/components/analytics/cross-chain-overview-card";
import {
  resolveRightPanelMode,
} from "@/components/artifacts/right-panel-routing";
import { RightPanelContent } from "@/components/artifacts/right-panel-content";
import { RightPanelStatusBanner } from "@/components/artifacts/right-panel-status-banner";
import { cn } from "@/lib/utils";
import { useRightPanelHeaderTitle } from "@/components/artifacts/use-right-panel-header-title";
export function RightPanelArtifact({
  leftPanelState,
  rightPanelState,
  defaultSize,
  panelRef,
  marketOverview,
  onDismissMarketOverview,
  artifactType,
  activeTool,
  activeEvent,
  ideSession,
  workflowCanvas,
  viewport = "desktop",
  embedded = false,
  onImmersiveChange,
}: RightPanelArtifactProps) {
  const [showBurnRateChart, setShowBurnRateChart] = useState(false);
  const {
    loading,
    error,
    canRetry,
    headerTitle: runtimeHeaderTitle,
    retryLastRequest,
  } = useArtifactRuntime();
  const {
    isCollapsed: leftCollapsed,
    collapse: leftCollapse,
    expand: leftExpand,
  } = leftPanelState;
  const { isCollapsed, isOpen, collapse, expand } = rightPanelState;
  const burnRate =
    useArtifactRegistryArtifact<BurnRateArtifactData>(BurnRateArtifact);
  const tableEditor =
    useArtifactRegistryArtifact<TableEditorArtifactData>(TableEditorArtifact);
  const agentWallets =
    useArtifactRegistryArtifact<AgentWalletsArtifactData>(AgentWalletsArtifact);
  const agentDaos = useArtifactRegistryArtifact<AgentDaosArtifactData>(
    AgentDaosArtifactRecord,
  );
  const daoWorkspace = useArtifactRegistryArtifact<DaoWorkspaceArtifactData>(
    DaoWorkspaceArtifactRecord,
  );
  const daoProposals = useArtifactRegistryArtifact<DaoProposalsArtifactData>(
    DaoProposalsArtifactRecord,
  );
  const daoTreasury = useArtifactRegistryArtifact<DaoTreasuryArtifactData>(
    DaoTreasuryArtifactRecord,
  );
  const marketTerminal =
    useArtifactRegistryArtifact<MarketTerminalArtifactPayload>(
      MarketTerminalArtifact,
    );
  const pumpFunV2 =
    useArtifactRegistryArtifact<PumpFunV2ArtifactData>(PumpFunV2Artifact);

  const tableEditorData = tableEditor.data;
  const burnRateData = burnRate.data;
  const agentWalletsData = agentWallets.data;
  const agentDaosData = agentDaos.data;
  const daoWorkspaceData = daoWorkspace.data;
  const daoProposalsData = daoProposals.data;
  const daoTreasuryData = daoTreasury.data;
  const marketTerminalData = marketTerminal.data;
  const pumpFunV2Data = pumpFunV2.data;
  const pumpFunV2Title = (() => {
    if (!pumpFunV2Data) {
      return null;
    }

    switch (pumpFunV2Data.view) {
      case "opportunity-list":
        return "Pump.fun Opportunities";
      case "token-dashboard":
      case "trade-result":
        return pumpFunV2Data.token.name;
      default:
        return null;
    }
  })();
  const panelMode = resolveRightPanelMode({
    activeTool,
    activeEvent,
    artifactType,
    ideSession,
    workflowCanvas,
  });
  const isWorkbenchPanel =
    panelMode === "workbench" || panelMode === "workflow";
  const headerTitle = useRightPanelHeaderTitle({
    agentDaosTitle: agentDaosData?.title,
    agentWalletsTitle: agentWalletsData?.title,
    artifactType,
    burnRateTitle: burnRateData?.metadata?.title,
    daoProposalsTitle: daoProposalsData?.title,
    daoTreasuryTitle: daoTreasuryData?.title,
    daoWorkspaceTitle: daoWorkspaceData?.title,
    ideSessionTitle: ideSession?.title,
    marketTerminalTitle: marketTerminalData?.title,
    pumpFunV2Title,
    runtimeHeaderTitle,
    tableTitle: tableEditorData?.metadata?.title,
    workflowCanvas,
  });
  useEffect(() => {
    if ((!isOpen || isCollapsed) && marketOverview?.visible) {
      onDismissMarketOverview?.();
    }
  }, [isOpen, isCollapsed, marketOverview?.visible, onDismissMarketOverview]);
  return (
    <>
      <ExpandablePanel
        aria-expanded={isOpen && !isCollapsed}
        className="h-full"
        collapseButtonLabel="Collapse"
        collapsedLabel="View Analysis"
        enableResize={false}
        collapsedSize={6}
        defaultSize={defaultSize}
        openClassName="h-full w-full"
        collapsedClassName="w-12"
        header={
          embedded || isWorkbenchPanel ? (
            <div className="hidden" />
          ) : (
            <RightPanelHeader
              title={headerTitle}
              leftCollapsed={leftCollapsed}
              onCollapseLeft={leftCollapsed ? leftExpand : leftCollapse}
              onCollapseRight={isCollapsed ? expand : collapse}
              rightCollapsed={isCollapsed}
            />
          )
        }
        isCollapsed={isCollapsed}
        isOpen={isOpen}
        maxSize={100}
        minSize={20}
        onCollapse={collapse}
        onExpand={expand}
        panelClassName={cn(
          "h-full rounded-[30px] border border-[var(--artifact-border)] bg-[var(--artifact-shell)]",
          embedded && "border-0 bg-transparent shadow-none",
          isWorkbenchPanel &&
            "border-[var(--artifact-border-strong)] bg-[var(--artifact-shell)]",
        )}
        contentClassName={cn(
          embedded
            ? "flex-1 overflow-hidden p-0"
            : isWorkbenchPanel
              ? "flex-1 overflow-hidden p-2"
              : "flex-1 overflow-y-auto p-4",
        )}
        panelRef={panelRef}
      >
        <RightPanelContent
          panelMode={panelMode}
          activeTool={activeTool}
          activeEvent={activeEvent}
          ideSession={ideSession}
          workflowCanvas={workflowCanvas}
          marketOverviewVisible={Boolean(marketOverview?.visible)}
          loading={loading}
          wallets={agentWalletsData?.wallets ?? []}
          daoDirectory={agentDaosData}
          daoWorkspace={daoWorkspaceData}
          daoProposals={daoProposalsData}
          daoTreasury={daoTreasuryData}
          onOpenBurnRateChart={() => setShowBurnRateChart(true)}
          onCollapsePanel={isCollapsed ? expand : collapse}
          viewport={viewport}
          onImmersiveChange={onImmersiveChange}
        />
        {marketOverview?.visible ? (
          <div className="mt-4">
            <CrossChainOverviewCard
              assets={marketOverview.assets}
              onClose={onDismissMarketOverview}
              enabled={marketOverview.visible && isOpen && !isCollapsed}
            />
          </div>
        ) : null}
        <RightPanelStatusBanner
          loading={loading}
          error={error}
          panelMode={panelMode}
          canRetry={canRetry}
          onRetry={retryLastRequest}
        />
      </ExpandablePanel>
      {showBurnRateChart ? (
        <BurnRateChart
          isOpen={showBurnRateChart}
          onClose={() => setShowBurnRateChart(false)}
        />
      ) : null}
    </>
  );
}
