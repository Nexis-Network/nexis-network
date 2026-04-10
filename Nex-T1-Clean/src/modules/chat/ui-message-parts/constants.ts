export const NATIVE_IDE_PART = "data-ide-session" as const;
export const NATIVE_WORKFLOW_PART = "data-workflow-canvas" as const;
export const NATIVE_ARTIFACT_CARD_PART = "data-artifact-card" as const;
export const NATIVE_TASK_PART = "data-task" as const;
export const NATIVE_QUEUE_PART = "data-queue" as const;
export const NATIVE_CHECKPOINT_PART = "data-checkpoint" as const;
export const NATIVE_TEST_RESULTS_PART = "data-test-results" as const;

export const CANONICAL_IDE_ARTIFACT_TYPES = [
  "code",
  "preview",
  "web",
  "canvas",
  "html",
  "pdf-viewer",
  "smart-contract-viewer",
  "transaction-flow",
] as const;

export const CANONICAL_ARTIFACT_CARD_TYPES = [
  "analysis",
  "chain",
  "search",
  "web-preview",
  "pyth-chart",
  "coingecko-chart",
  "nft-chart",
  "image-artifact",
  "file-analysis",
  "table-editor",
  "market-terminal",
  "agent-daos",
  "dao-workspace",
  "dao-proposals",
  "dao-treasury",
  "approval_required",
  "approval_update",
  "execution-result",
  "polymarket-widget",
  "polymarket-markets",
  "polymarket-market-detail",
  "polymarket-orderbook",
  "polymarket-price-chart",
  "polymarket-price-data",
  "polymarket-positions",
  "polymarket-trades",
  "polymarket-trade-preview",
  "polymarket-order-status",
  "polymarket-bridge-status",
  "polymarket-deposit-info",
  "polymarket-supported-assets",
  "polymarket-balance",
  "polymarket-blocked",
  "polymarket-error",
] as const;
