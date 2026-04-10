/* ------------------------------------------------------------------ */
/*  Agent Wallet Types, Constants & Helpers                            */
/* ------------------------------------------------------------------ */

export type AgentWalletRow = {
  address: string;
  platform: string;
  chainId: number | string;
  label: string | null;
  status: "active" | "provisioning" | "revoked";
  generation: number;
  balanceUsd: number;
};

export type AgentSummary = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  ownerUserId: string | null;
  wallets: AgentWalletRow[];
  currentGeneration: number;
  totalNetWorthUsd: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const CURRENCY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

/* ------------------------------------------------------------------ */
/*  Coercion Helpers                                                   */
/* ------------------------------------------------------------------ */

export function coerceNumber(value: UntypedJson, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function coerceString(value: UntypedJson, fallback = ""): string {
  return typeof value === "string" ? value : String(value ?? fallback);
}
