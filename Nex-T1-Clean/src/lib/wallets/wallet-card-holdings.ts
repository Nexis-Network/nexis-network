export type WalletCardHoldingKind =
  | "native"
  | "token"
  | "nft"
  | "remaining";

export type WalletCardHolding = {
  id: string;
  kind: Exclude<WalletCardHoldingKind, "remaining">;
  label: string;
  symbol: string | null;
  valueUsd: number;
  quantity: number | null;
  logoURI: string | null;
};

export type WalletCardSummaryPayload = {
  address: string;
  platform: "evm" | "solana";
  chainId: string | null;
  network: "mainnet" | "devnet";
  totalValueUsd: number | null;
  tokenCount: number;
  nftCount: number;
  holdings: WalletCardHolding[];
};

export type WalletCardHoldingSegment = {
  id: string;
  kind: WalletCardHoldingKind;
  label: string;
  valueUsd: number;
  quantity: number | null;
  logoURI: string | null;
  share: number;
};

const MAX_VISIBLE_SEGMENTS = 5;
const MAX_DIRECT_SEGMENTS = MAX_VISIBLE_SEGMENTS - 1;

function toFiniteNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toDisplayWeight(
  holding: Pick<WalletCardHolding, "kind" | "valueUsd" | "quantity">,
  totalValueUsd: number,
): number {
  const directValue = toFiniteNumber(holding.valueUsd);
  if (directValue > 0) return directValue;

  const quantity = toFiniteNumber(holding.quantity);
  if (holding.kind === "nft" && quantity > 0) {
    return Math.max(totalValueUsd * 0.08, 1);
  }

  if (quantity > 0) {
    return 1;
  }

  return 0;
}

export function buildWalletCardHoldingSegments(
  summary: WalletCardSummaryPayload,
): WalletCardHoldingSegment[] {
  const holdings = [...summary.holdings];
  const hasNftHolding = holdings.some((holding) => holding.kind === "nft");

  if (!hasNftHolding && summary.nftCount > 0) {
    holdings.push({
      id: "wallet-nfts",
      kind: "nft",
      label: "NFTs",
      symbol: null,
      valueUsd: 0,
      quantity: summary.nftCount,
      logoURI: null,
    });
  }

  const totalValueUsd = Math.max(
    toFiniteNumber(summary.totalValueUsd),
    holdings.reduce((sum, holding) => sum + toFiniteNumber(holding.valueUsd), 0),
  );

  const ranked = holdings
    .map((holding) => ({
      ...holding,
      weight: toDisplayWeight(holding, totalValueUsd),
    }))
    .filter((holding) => holding.weight > 0)
    .sort((left, right) => right.weight - left.weight);

  if (ranked.length === 0) {
    return [];
  }

  const direct = ranked.slice(0, MAX_DIRECT_SEGMENTS);
  const overflow = ranked.slice(MAX_DIRECT_SEGMENTS);
  const visible = [...direct];

  if (overflow.length > 0) {
    visible.push({
      id: "wallet-holdings-remaining",
      kind: "token",
      label: "Remaining",
      symbol: null,
      valueUsd: overflow.reduce((sum, holding) => sum + toFiniteNumber(holding.valueUsd), 0),
      quantity: overflow.reduce((sum, holding) => sum + toFiniteNumber(holding.quantity), 0),
      logoURI: null,
      weight: overflow.reduce((sum, holding) => sum + holding.weight, 0),
    });
  }

  const totalWeight = visible.reduce((sum, holding) => sum + holding.weight, 0);
  if (totalWeight <= 0) {
    return [];
  }

  return visible.map((holding, index) => {
    const isRemaining = holding.id === "wallet-holdings-remaining";
    const rawShare = (holding.weight / totalWeight) * 100;
    const isLast = index === visible.length - 1;
    const consumedShare = visible
      .slice(0, index)
      .reduce((sum, entry) => sum + (entry.weight / totalWeight) * 100, 0);

    return {
      id: holding.id,
      kind: isRemaining ? "remaining" : holding.kind,
      label: holding.label,
      valueUsd: toFiniteNumber(holding.valueUsd),
      quantity: holding.quantity,
      logoURI: holding.logoURI,
      share: isLast ? Math.max(0, 100 - consumedShare) : rawShare,
    };
  });
}
