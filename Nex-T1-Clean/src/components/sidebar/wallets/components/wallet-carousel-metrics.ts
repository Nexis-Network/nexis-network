import type { WalletTokenPosition } from "@/modules/wallets/profile";

type TokenLike = Pick<
  WalletTokenPosition,
  "balance" | "priceUsd" | "valueUsd" | "change24hPercent"
>;

export function computeWallet24hChangePercent(tokens: readonly TokenLike[]): number | null {
  if (!tokens.length) return null;

  let weighted = 0;
  let totalUsd = 0;

  for (const token of tokens) {
    const change = token.change24hPercent;
    if (typeof change !== "number" || !Number.isFinite(change)) continue;

    const valueUsd = resolveTokenUsdValue(token);
    if (valueUsd <= 0) continue;

    weighted += valueUsd * change;
    totalUsd += valueUsd;
  }

  if (totalUsd <= 0) return null;
  return weighted / totalUsd;
}

export function inferPreviousNetWorth(
  currentNetWorthUsd: number,
  change24hPercent: number | null,
): number | null {
  if (!Number.isFinite(currentNetWorthUsd) || currentNetWorthUsd <= 0) return null;
  if (typeof change24hPercent !== "number" || !Number.isFinite(change24hPercent)) return null;

  const denominator = 1 + change24hPercent / 100;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;

  return currentNetWorthUsd / denominator;
}

export function buildWalletNetWorthSparkline(params: {
  currentNetWorthUsd: number;
  change24hPercent: number | null;
  points?: number;
}): number[] {
  const points = Math.max(8, Math.min(48, params.points ?? 24));
  const current = Number.isFinite(params.currentNetWorthUsd)
    ? Math.max(0, params.currentNetWorthUsd)
    : 0;

  const previous = inferPreviousNetWorth(current, params.change24hPercent);
  const start = previous ?? current;
  const out: number[] = [];

  for (let i = 0; i < points; i += 1) {
    const t = points === 1 ? 1 : i / (points - 1);
    // Smooth, deterministic curve so we avoid flat/noisy lines when history is unavailable.
    const curve = Math.sin(t * Math.PI * 2) * 0.02 * (current || 1);
    const value = start + (current - start) * t + curve * (1 - Math.abs(0.5 - t) * 2);
    out.push(Math.max(0, value));
  }

  out[points - 1] = current;
  return out;
}

function resolveTokenUsdValue(token: TokenLike): number {
  if (typeof token.valueUsd === "number" && Number.isFinite(token.valueUsd)) {
    return Math.max(0, token.valueUsd);
  }

  if (
    typeof token.balance === "number" &&
    Number.isFinite(token.balance) &&
    typeof token.priceUsd === "number" &&
    Number.isFinite(token.priceUsd)
  ) {
    return Math.max(0, token.balance * token.priceUsd);
  }

  return 0;
}
