import type { AssetTick } from "@/lib/utils/asset-normalization";
import { getChainInfo, resolveChainId, SOLANA_CHAIN_ID } from "@/modules/tokens/chains";

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value || 0);
}

export function truncateAddress(address: string): string {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getHistoryBounds(history: [number, number][]): {
  highPrice: number;
  lowPrice: number;
} {
  if (history.length === 0) {
    return { highPrice: 0, lowPrice: 0 };
  }

  const prices = history.map((entry) => entry[1]);
  return {
    highPrice: Math.max(...prices),
    lowPrice: Math.min(...prices),
  };
}

export function resolveAssetChainLabel(asset: AssetTick): string {
  const chainId = resolveChainId(asset.chainId ?? undefined);
  if (chainId) {
    return getChainInfo(chainId)?.name ?? asset.chainId ?? "Unknown";
  }

  return asset.chainId === "solana" ? "Solana" : "Ethereum";
}

export function resolveAssetExplorerUrl(asset: AssetTick): string {
  if (asset.explorerUrl) {
    return asset.explorerUrl;
  }

  const chainId = resolveChainId(asset.chainId ?? undefined);
  const chain = chainId ? getChainInfo(chainId) : null;

  if (!chain) {
    return asset.address === "native" ? "#" : `https://etherscan.io/token/${asset.address}`;
  }

  if (asset.address === "native") {
    return chain.explorerBaseUrl;
  }

  return `${chain.explorerBaseUrl}/token/${asset.address}`;
}

export function isSolanaAsset(asset: AssetTick): boolean {
  return resolveChainId(asset.chainId ?? undefined) === SOLANA_CHAIN_ID;
}

export function buildAssetMarketContext(input: {
  asset: AssetTick;
  price: number;
  change24h: number;
  timeframe: string;
  marketCap: number;
  volume24h: number;
  highPrice: number;
  lowPrice: number;
}): string {
  const {
    asset,
    price,
    change24h,
    timeframe,
    marketCap,
    volume24h,
    highPrice,
    lowPrice,
  } = input;

  return `
Running Context: Asset Page for ${asset.symbol} (${asset.name})
Price: $${price.toFixed(5)}
24h Change: ${change24h.toFixed(2)}%
Market Cap: ${formatCompactCurrency(marketCap)}
Volume 24h: ${formatCompactCurrency(volume24h)}
High (${timeframe}): $${highPrice.toFixed(5)}
Low (${timeframe}): $${lowPrice.toFixed(5)}
Description: ${asset.description || "N/A"}
Address: ${asset.address}
Chain: ${asset.chainId}
  `.trim();
}
