import type { LaunchpadCampaignStatus } from "@/lib/launchpad/types";

type LaunchControlsLike = {
  whitelistEnabled?: boolean;
  whitelistOnlyUntilTs?: string | null;
};

type ContributionLike = {
  contributorUserId: string;
  amountBaseUnits: string;
  sharesMintedBaseUnits: string;
  txHash?: string | null;
  createdAt: string;
};

type WalletLike = {
  namespace: string;
  address: string;
  verifiedAt: string | null;
};

export type CampaignSaleRound = "Preparation" | "Whitelist" | "Public" | "Closed";

export type AggregatedParticipant = {
  userId: string;
  contributionCount: number;
  totalContributedBaseUnits: string;
  totalSharesBaseUnits: string;
  latestContributionAt: string;
  lastTxHash: string | null;
};

const TEAM_ROLE_WEIGHT: Record<string, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  viewer: 1,
};

export function parseBaseUnitsSafe(value: string | number): bigint {
  const raw = String(value);
  if (!/^\d+$/.test(raw)) return 0n;
  return BigInt(raw);
}

export function computeCampaignProgressBps(raised: string | number, target: string | number): number {
  const targetValue = parseBaseUnitsSafe(target);
  if (targetValue <= 0n) return 0;

  const raisedValue = parseBaseUnitsSafe(raised);
  const bps = Number((raisedValue * 10_000n) / targetValue);
  return Math.max(0, Math.min(10_000, bps));
}

export function deriveCampaignSaleRound(
  status: LaunchpadCampaignStatus,
  launchControls: LaunchControlsLike | null | undefined,
  now = Date.now(),
): CampaignSaleRound {
  if (status === "finalized" || status === "cancelled") return "Closed";
  if (status === "draft") return "Preparation";

  const controls = launchControls ?? {};
  if (!controls.whitelistEnabled) return "Public";

  const whitelistUntil = controls.whitelistOnlyUntilTs ? Date.parse(controls.whitelistOnlyUntilTs) : Number.NaN;
  if (!Number.isFinite(whitelistUntil)) return "Whitelist";

  return now <= whitelistUntil ? "Whitelist" : "Public";
}

export function aggregateParticipants(contributions: ContributionLike[]): AggregatedParticipant[] {
  const byUser = new Map<string, AggregatedParticipant>();

  for (const row of contributions) {
    const current = byUser.get(row.contributorUserId);
    const amount = parseBaseUnitsSafe(row.amountBaseUnits);
    const shares = parseBaseUnitsSafe(row.sharesMintedBaseUnits);
    const createdAtMs = Date.parse(row.createdAt);

    if (!current) {
      byUser.set(row.contributorUserId, {
        userId: row.contributorUserId,
        contributionCount: 1,
        totalContributedBaseUnits: amount.toString(),
        totalSharesBaseUnits: shares.toString(),
        latestContributionAt: row.createdAt,
        lastTxHash: row.txHash ?? null,
      });
      continue;
    }

    current.contributionCount += 1;
    current.totalContributedBaseUnits = (parseBaseUnitsSafe(current.totalContributedBaseUnits) + amount).toString();
    current.totalSharesBaseUnits = (parseBaseUnitsSafe(current.totalSharesBaseUnits) + shares).toString();

    const latestMs = Date.parse(current.latestContributionAt);
    if (Number.isFinite(createdAtMs) && (!Number.isFinite(latestMs) || createdAtMs > latestMs)) {
      current.latestContributionAt = row.createdAt;
      current.lastTxHash = row.txHash ?? current.lastTxHash;
    }
  }

  return Array.from(byUser.values()).sort((left, right) => {
    const leftTotal = parseBaseUnitsSafe(left.totalContributedBaseUnits);
    const rightTotal = parseBaseUnitsSafe(right.totalContributedBaseUnits);
    if (leftTotal !== rightTotal) return leftTotal > rightTotal ? -1 : 1;

    const leftTs = Date.parse(left.latestContributionAt);
    const rightTs = Date.parse(right.latestContributionAt);
    return (Number.isFinite(rightTs) ? rightTs : 0) - (Number.isFinite(leftTs) ? leftTs : 0);
  });
}

export function pickPreferredWallet(
  wallets: WalletLike[],
  chainFamily: "evm" | "solana",
): WalletLike | null {
  if (wallets.length === 0) return null;

  const preferredNamespace = chainFamily === "solana" ? "solana" : "eip155";
  const normalized = wallets
    .map((wallet) => ({
      ...wallet,
      namespace: wallet.namespace.toLowerCase(),
    }))
    .sort((left, right) => {
      const leftVerified = left.verifiedAt ? Date.parse(left.verifiedAt) : Number.NaN;
      const rightVerified = right.verifiedAt ? Date.parse(right.verifiedAt) : Number.NaN;
      return (Number.isFinite(rightVerified) ? rightVerified : 0) - (Number.isFinite(leftVerified) ? leftVerified : 0);
    });

  return normalized.find((wallet) => wallet.namespace === preferredNamespace) ?? normalized[0] ?? null;
}

export function sortTeamMembersByRole<T extends { role: string; createdAt?: string | null }>(members: T[]): T[] {
  return [...members].sort((left, right) => {
    const leftWeight = TEAM_ROLE_WEIGHT[left.role.toLowerCase()] ?? 0;
    const rightWeight = TEAM_ROLE_WEIGHT[right.role.toLowerCase()] ?? 0;
    if (leftWeight !== rightWeight) return rightWeight - leftWeight;

    const leftTs = Date.parse(left.createdAt ?? "");
    const rightTs = Date.parse(right.createdAt ?? "");
    return (Number.isFinite(leftTs) ? leftTs : 0) - (Number.isFinite(rightTs) ? rightTs : 0);
  });
}

export function computeSpotPriceBaseUnits(totalAmountBaseUnits: string, totalSharesBaseUnits: string, precision = 8): string | null {
  const numerator = parseBaseUnitsSafe(totalAmountBaseUnits);
  const denominator = parseBaseUnitsSafe(totalSharesBaseUnits);
  if (denominator <= 0n) return null;

  const whole = numerator / denominator;
  const scale = 10n ** BigInt(Math.max(0, precision));
  const fractionValue = ((numerator % denominator) * scale) / denominator;
  const fraction = fractionValue.toString().padStart(Math.max(0, precision), "0").replace(/0+$/, "");
  return fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
}
