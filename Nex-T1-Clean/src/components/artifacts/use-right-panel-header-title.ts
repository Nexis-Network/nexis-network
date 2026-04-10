"use client";

import { useMemo } from "react";
import { isDedicatedWorkflowCanvas } from "@/components/artifacts/right-panel-routing";
import type { NativeWorkflowCanvasData } from "@/modules/chat/ui-message-parts";

type UseRightPanelHeaderTitleArgs = {
  agentDaosTitle?: string | null;
  agentWalletsTitle?: string | null;
  artifactType?: string | null;
  burnRateTitle?: string | null;
  daoProposalsTitle?: string | null;
  daoTreasuryTitle?: string | null;
  daoWorkspaceTitle?: string | null;
  ideSessionTitle?: string;
  marketTerminalTitle?: string | null;
  pumpFunV2Title?: string | null;
  runtimeHeaderTitle: string;
  tableTitle?: string | null;
  workflowCanvas?: NativeWorkflowCanvasData | null;
};

export function useRightPanelHeaderTitle({
  agentDaosTitle,
  agentWalletsTitle,
  artifactType,
  burnRateTitle,
  daoProposalsTitle,
  daoTreasuryTitle,
  daoWorkspaceTitle,
  ideSessionTitle,
  marketTerminalTitle,
  pumpFunV2Title,
  runtimeHeaderTitle,
  tableTitle,
  workflowCanvas,
}: UseRightPanelHeaderTitleArgs) {
  return useMemo(() => {
    if (ideSessionTitle) return ideSessionTitle;
    if (isDedicatedWorkflowCanvas(workflowCanvas) && workflowCanvas.title) {
      return workflowCanvas.title;
    }

    const artifactTitleMap: Record<string, string | null | undefined> = {
      table: tableTitle,
      "table-editor": tableTitle,
      market_terminal: marketTerminalTitle,
      "market-terminal": marketTerminalTitle,
      agent_wallets: agentWalletsTitle,
      "agent-wallets": agentWalletsTitle,
      agent_daos: agentDaosTitle,
      "agent-daos": agentDaosTitle,
      dao_workspace: daoWorkspaceTitle,
      "dao-workspace": daoWorkspaceTitle,
      dao_proposals: daoProposalsTitle,
      "dao-proposals": daoProposalsTitle,
      dao_treasury: daoTreasuryTitle,
      "dao-treasury": daoTreasuryTitle,
      burn_rate: burnRateTitle,
      "burn-rate-chart": burnRateTitle,
      pumpfun_v2: pumpFunV2Title,
      "pumpfun-v2": pumpFunV2Title,
    };
    const resolved = artifactType ? artifactTitleMap[artifactType] : null;
    return resolved && resolved.trim().length > 0
      ? resolved
      : runtimeHeaderTitle;
  }, [
    agentDaosTitle,
    agentWalletsTitle,
    artifactType,
    burnRateTitle,
    daoProposalsTitle,
    daoTreasuryTitle,
    daoWorkspaceTitle,
    ideSessionTitle,
    marketTerminalTitle,
    pumpFunV2Title,
    runtimeHeaderTitle,
    tableTitle,
    workflowCanvas,
  ]);
}
