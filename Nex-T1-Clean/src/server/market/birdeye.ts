import {
  getCoinDetails as getCoinGeckoCoinDetails,
  getCoinIdByContract as resolveCoinIdByContract,
  getCoinMarketChart as getCoinGeckoCoinMarketChart,
} from "@/server/market/coingecko";
import { fetchNexSolanaWalletSummary } from "@/server/services/nex/wallet-summary";
import type { CachedResponse, CoinChartQueryParams, CoinDetails, CoinMarketChart } from "@/types/market";

const LEGACY_PLATFORM_MAP: Record<string, string> = {
  ethereum: "ethereum",
  eth: "ethereum",
  polygon: "polygon-pos",
  "polygon-pos": "polygon-pos",
  arbitrum: "arbitrum-one",
  "arbitrum-one": "arbitrum-one",
  optimism: "optimistic-ethereum",
  "optimistic-ethereum": "optimistic-ethereum",
  base: "base",
  bsc: "binance-smart-chain",
  "binance-smart-chain": "binance-smart-chain",
  avalanche: "avalanche",
  avax: "avalanche",
  solana: "solana",
  zksync: "zksync",
  sui: "sui",
};

export class BirdeyeChainNotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BirdeyeChainNotSupportedError";
  }
}

function normalizeLegacyPlatform(platform: string): string | null {
  const normalized = platform.trim().toLowerCase();
  if (!normalized) return null;
  return LEGACY_PLATFORM_MAP[normalized] ?? null;
}

function parseLegacyContractIdentifier(id: string): { platform: string; contractAddress: string } | null {
  const [platformRaw, contractRaw] = id.split(":");
  if (!platformRaw || !contractRaw) return null;

  const platform = normalizeLegacyPlatform(platformRaw);
  const contractAddress = contractRaw.trim();
  if (!platform || !contractAddress) return null;

  return { platform, contractAddress };
}

async function resolveCoinIdOrThrow(platform: string, contractAddress: string): Promise<string> {
  const resolved = await resolveCoinIdByContract(platform, contractAddress);
  if (resolved.data) {
    return resolved.data;
  }

  throw new BirdeyeChainNotSupportedError(
    `No CoinGecko contract mapping available for ${platform}:${contractAddress}`,
  );
}

export function isBirdeyeChainNotSupportedError(error: unknown): error is BirdeyeChainNotSupportedError {
  return error instanceof BirdeyeChainNotSupportedError;
}

export async function getCoinIdByContract(platform: string, contractAddress: string): Promise<string> {
  const normalizedPlatform = normalizeLegacyPlatform(platform);
  const normalizedAddress = contractAddress.trim();

  if (!normalizedPlatform) {
    throw new BirdeyeChainNotSupportedError(`Unsupported platform: ${platform}`);
  }
  if (!normalizedAddress) {
    throw new Error("Contract address is required");
  }

  const resolved = await resolveCoinIdByContract(normalizedPlatform, normalizedAddress);
  return resolved.data ?? `${normalizedPlatform}:${normalizedAddress}`;
}

export async function getCoinDetails(id: string): Promise<CachedResponse<CoinDetails>> {
  const contractIdentifier = parseLegacyContractIdentifier(id);
  if (!contractIdentifier) {
    return getCoinGeckoCoinDetails(id);
  }

  const resolvedCoinId = await resolveCoinIdOrThrow(contractIdentifier.platform, contractIdentifier.contractAddress);
  return getCoinGeckoCoinDetails(resolvedCoinId);
}

export async function getCoinMarketChart(
  id: string,
  params: CoinChartQueryParams,
): Promise<CachedResponse<CoinMarketChart>> {
  const contractIdentifier = parseLegacyContractIdentifier(id);
  if (!contractIdentifier) {
    return getCoinGeckoCoinMarketChart(id, params);
  }

  const resolvedCoinId = await resolveCoinIdOrThrow(contractIdentifier.platform, contractIdentifier.contractAddress);
  return getCoinGeckoCoinMarketChart(resolvedCoinId, params);
}

export async function getWalletNetWorth(
  address: string,
  chainId: number | string = 101,
): Promise<{ wallet: string; totalUsd: number }> {
  const normalizedAddress = address.trim();
  if (!normalizedAddress) {
    throw new Error("Wallet address is required");
  }

  const normalizedChain = String(chainId).toLowerCase();
  if (normalizedChain !== "101" && normalizedChain !== "solana") {
    throw new BirdeyeChainNotSupportedError(`Wallet net worth only supports Solana (received ${chainId})`);
  }

  const summary = await fetchNexSolanaWalletSummary(normalizedAddress, {
    includeTokens: true,
    includeNfts: true,
    includeTransactions: false,
  });

  const totalUsd = summary.tokens.reduce((sum, token) => {
    const value = token.valueUsd;
    if (typeof value === "number" && Number.isFinite(value)) {
      return sum + value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? sum + parsed : sum;
    }
    return sum;
  }, 0);

  return {
    wallet: normalizedAddress,
    totalUsd,
  };
}
