const WORKBENCH_ARTIFACT_TYPES = new Set([
  "code",
  "preview",
  "web",
  "canvas",
  "html",
  "pdf-viewer",
  "smart-contract-viewer",
  "transaction-flow",
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
]);

const DEDICATED_ARTIFACT_PANEL_TYPES = new Set([
  "table",
  "table-editor",
  "market-terminal",
  "market_terminal",
  "agent_wallets",
  "agent-wallets",
  "agent_daos",
  "agent-daos",
  "dao_workspace",
  "dao-workspace",
  "dao_proposals",
  "dao-proposals",
  "dao_treasury",
  "dao-treasury",
  "burn_rate",
  "burn-rate-chart",
  "pumpfun-v2",
  "pumpfun_v2",
]);

export function isWorkbenchArtifactType(
  artifactType?: string | null,
): boolean {
  return Boolean(artifactType && WORKBENCH_ARTIFACT_TYPES.has(artifactType));
}

export function isDedicatedArtifactPanelType(
  artifactType?: string | null,
): boolean {
  return Boolean(
    artifactType && DEDICATED_ARTIFACT_PANEL_TYPES.has(artifactType),
  );
}

export function isRightPanelOnlyArtifactType(
  artifactType?: string | null,
): boolean {
  return (
    isWorkbenchArtifactType(artifactType) ||
    isDedicatedArtifactPanelType(artifactType)
  );
}
