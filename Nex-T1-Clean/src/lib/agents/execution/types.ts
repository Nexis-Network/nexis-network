import type { StrategySnapshot, StrategyWorkflowNode } from "@/lib/strategies/types";

export type StrategyExecutionContext = {
  agentId: string;
  agentVersionId: string;
  orgId: string;
  strategySnapshotId: string;
  snapshot: StrategySnapshot;
};

export type ZeroExSwapInstruction = {
  node: StrategyWorkflowNode;
  amountMode: "SELL" | "BUY";
  amount: string;
  sellToken: string;
  buyToken: string;
  chainId: number;
  slippageBps: number;
  takerAddress?: string;
};

export type ExecutedTrade = {
  transactionHash: string;
  notionalUsd: number;
  amount: number;
  pnlUsd: number;
  pnlPercent: number | null;
  wasWin: boolean | null;
  executedAt: Date;
};
