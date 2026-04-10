import type { UpdateStrategyBindingPayload } from "@/modules/automation/types";

// ---------------------------------------------------------------------------
// Form & mutation state types
// ---------------------------------------------------------------------------

export type StrategyFormState = {
  name: string;
  description: string;
  parameters: string;
  metadata: string;
};

export type BindingFormState = {
  agentIdentifier: string;
  metadata: string;
};

export type StrategyMutationState = {
  isPending: boolean;
  targetId: string | null;
};

export type MemecoinRecommendation = {
  mint: string;
  score: number;
  at: string;
  reasons?: string[];
};

export type AnchorFormState = { chainSlug: string; txHash: string };

// ---------------------------------------------------------------------------
// Binding status
// ---------------------------------------------------------------------------

export type BindingStatus = NonNullable<UpdateStrategyBindingPayload["status"]>;

export const BINDING_STATUS_OPTIONS: readonly BindingStatus[] = [
  "pending",
  "approved",
  "rejected",
  "revoked",
];

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------

export const DEFAULT_STRATEGY_FORM: StrategyFormState = {
  name: "",
  description: "",
  parameters: "{\n  \n}",
  metadata: "{\n  \n}",
};

export const DEFAULT_BINDING_FORM: BindingFormState = {
  agentIdentifier: "",
  metadata: "{\n  \n}",
};

// ---------------------------------------------------------------------------
// Solana memecoin template
// ---------------------------------------------------------------------------

export const SOLANA_MEMECOIN_AUTOTRADE_TEMPLATE = {
  name: "Solana memecoin autotrade (propose-only)",
  description:
    "Axiom-like pump.fun discovery + scoring. Propose-only until you explicitly enable execute mode.",
  parameters: {
    kind: "solana_memecoin_autotrade",
    cluster: "mainnet-beta",
    universe: "pumpfun_bonding",
    candidateLimit: 80,
    enrichTopN: 40,
    minLiquidityUsd: 5000,
    maxMarketCapUsd: 250000,
    minVolume24hUsd: 2000,
    minBondingProgress: 10,
    maxBondingProgress: 95,
    minReturnPct1h: -10,
    maxVolatilityPct1h: 60,
    maxTopTraderShare: 0.25,
    minUniqueTraders: 30,
    kolWallets: [],
    kolLookbackMinutes: 180,
    minScoreToTrade: 70,
    execution: {
      mode: "propose",
      signingMode: "non_custodial",
      chainId: 101,
      buyAmountSol: 0.05,
      slippageBps: 500,
      maxTradesPerDay: 10,
      maxSolPerDay: 1.0,
      cooldownMinutesPerMint: 120,
    },
  },
  metadata: {},
} as const;

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function describeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function safeParseJson(value: string): Record<string, UntypedJson> {
  if (!value || value.trim().length === 0) {
    return {};
  }
  return JSON.parse(value);
}

export function truncateMiddle(value: string, length: number): string {
  if (!value) return "";
  if (value.length <= length) return value;
  const half = Math.floor(length / 2);
  return `${value.slice(0, half)}\u2026${value.slice(-half)}`;
}

export function isBindingStatus(
  value: string | null | undefined,
): value is BindingStatus {
  return (
    value != null &&
    (BINDING_STATUS_OPTIONS as readonly string[]).includes(value)
  );
}

export function readMemecoinRecommendation(
  metadata: Record<string, UntypedJson>,
): MemecoinRecommendation | null {
  const raw = metadata?.lastRecommendation;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const rec = raw as Record<string, UntypedJson>;
  const mint = typeof rec.mint === "string" ? rec.mint : null;
  const score =
    typeof rec.score === "number" && Number.isFinite(rec.score)
      ? rec.score
      : null;
  const at = typeof rec.at === "string" ? rec.at : null;

  if (!mint || score == null || !at) return null;

  const reasons = Array.isArray(rec.reasons)
    ? rec.reasons.filter((v) => typeof v === "string")
    : undefined;

  return { mint, score, at, reasons };
}
