export type AgentRole =
  | "orchestrator"
  | "market_analyst"
  | "wallet_operator"
  | "defi_worker"
  | "solana_worker"
  | "research_worker"
  | "general";

// Map each role to the set of tool categories it may access.
// Uses string sets to avoid tight coupling with ToolCategory type.
export const ROLE_ALLOWED_CATEGORIES: Record<AgentRole, ReadonlySet<string>> = {
  orchestrator: new Set([]),
  market_analyst: new Set(["market", "research"]),
  wallet_operator: new Set(["wallet", "onchain"]),
  defi_worker: new Set(["defi", "market", "onchain"]),
  solana_worker: new Set(["solana", "market"]),
  research_worker: new Set(["research"]),
  general: new Set([
    "wallet",
    "defi",
    "market",
    "onchain",
    "research",
    "solana",
    "mcp",
    "unknown",
  ]),
};

export function isRoleScopingEnabled(): boolean {
  return process.env.NEX_ROLE_SCOPING_ENABLED === "true";
}
