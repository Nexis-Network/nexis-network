import "server-only";

import { Connection } from "@solana/web3.js";
import { createPublicClient, formatUnits, http } from "viem";
import { arbitrum, base, bsc, mainnet, optimism, polygon } from "viem/chains";

import type { ProfileAggregate, WalletPortfolio } from "@/lib/user/profile";
import type { ChatAgentRequest } from "@/modules/chat/types";
import { getGlobalMarketData, getCoinPricesByIds } from "@/server/market/coingecko";
import { coingeckoWS, type CoinGeckoWsPriceUpdate } from "@/server/market/coingecko-ws";
import { getMarketSentiment } from "@/server/market/coinmarketcap";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import { WalletAssetsService } from "@/server/services/wallet-assets";
import type { AggregatedToken } from "@/server/settings/wallet-aggregator";
import { getWalletHoldingsAggregate } from "@/server/settings/wallet-aggregator";
import { resolveUserWallets } from "@/server/wallets/user-wallets";

import { logger } from "@/lib/logger";

const SESSION_SNAPSHOT_TTL_SECONDS = 60 * 60 * 12;
const COINGECKO_COIN_IDS = ["ethereum", "bitcoin", "solana", "binancecoin"] as const;
const TEMP_WS_WAIT_MS = 1_500;
const TEMP_WS_POLL_MS = 150;
const SOLANA_PRIORITY_FEE_DEFAULT_LEVEL = "high";

const EVM_GAS_NETWORKS = [
  { key: "ethereum", chainId: 1, label: "Ethereum", chain: mainnet },
  { key: "base", chainId: 8453, label: "Base", chain: base },
  { key: "optimism", chainId: 10, label: "Optimism", chain: optimism },
  { key: "arbitrum", chainId: 42161, label: "Arbitrum", chain: arbitrum },
  { key: "polygon", chainId: 137, label: "Polygon", chain: polygon },
  { key: "bnbChain", chainId: 56, label: "BNB Chain", chain: bsc },
] as const;

type CoinGeckoCoinId = (typeof COINGECKO_COIN_IDS)[number];
type EvmGasNetworkKey = (typeof EVM_GAS_NETWORKS)[number]["key"];

type PriceKey = "eth" | "btc" | "sol" | "bnb";

type ChatStartPricePoint = {
  coinId: CoinGeckoCoinId;
  symbol: string;
  priceUsd: number | null;
  change24hPct: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  source: "coingecko_ws" | "coingecko_api" | "unavailable";
  lastUpdatedAt: string | null;
};

type ChatStartGasPoint = {
  label: string;
  gasPriceGwei: number | null;
  maxFeePerGasGwei: number | null;
  maxPriorityFeePerGasGwei: number | null;
  source: "rpc" | "unavailable";
};

type SolanaPriorityFeePoint = {
  label: string;
  priorityFeeMicroLamports: number | null;
  priorityLevel: string | null;
  source: "helius_rpc" | "solana_rpc" | "unavailable";
};

type PortfolioWalletSummary = {
  walletId: string;
  label: string;
  address: string;
  platform: "evm" | "solana";
  chainId: number | null;
  source: "profile" | "request";
  isSelected: boolean;
  netWorthUsd: number | null;
  approxPnl24hUsd: number | null;
  topHoldings: Array<{
    symbol: string;
    valueUsd: number;
  }>;
};

type PortfolioHoldingSummary = {
  symbol: string;
  valueUsd: number;
  platform: "evm" | "solana";
};

export type ChatStartSnapshot = {
  capturedAt: string;
  user: {
    timeZone: string;
    locale: string | null;
    localTime: string;
  };
  market: {
    prices: Record<PriceKey, ChatStartPricePoint>;
    totalCryptoMarketCapUsd: number | null;
    fearGreed: {
      score: number | null;
      classification: string | null;
      updatedAt: string | null;
      source: "coinmarketcap" | "unavailable";
    };
    gas: Record<EvmGasNetworkKey, ChatStartGasPoint>;
    solanaPriorityFee: SolanaPriorityFeePoint;
  };
  portfolio: {
    selectedWalletAddress: string | null;
    walletCount: number;
    totalNetWorthUsd: number | null;
    approxPnl24hUsd: number | null;
    wallets: PortfolioWalletSummary[];
    topHoldings: PortfolioHoldingSummary[];
  };
  promptContext: {
    market: string;
    portfolio: string;
  };
};

type BuildChatStartSnapshotParams = {
  sessionId?: string | null;
  userId?: string | null;
  profile?: ProfileAggregate | null;
  request: ChatAgentRequest;
};

type WalletDescriptor = {
  walletId: string;
  label: string;
  address: string;
  platform: "evm" | "solana";
  chainId: number | null;
  source: "profile" | "request";
  isSelected: boolean;
};

type HoldingsComputation = {
  descriptors: WalletDescriptor[];
  tokens: AggregatedToken[];
};

function formatUsd(value: number | null | undefined, options?: { compact?: boolean }): string {
  if (value == null || !Number.isFinite(value)) {
    return "unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: options?.compact ? 2 : value >= 100 ? 0 : 2,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "n/a";
  }

  const rounded = value >= 100 ? value.toFixed(0) : value.toFixed(2);
  return `${value >= 0 ? "+" : ""}${rounded}%`;
}

function formatAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeEvmAddress(address: string): string {
  return address.trim().toLowerCase();
}

function normalizeWalletAddress(platform: "evm" | "solana", address: string): string {
  return platform === "evm" ? normalizeEvmAddress(address) : address.trim();
}

function descriptorKey(platform: "evm" | "solana", address: string): string {
  return `${platform}:${normalizeWalletAddress(platform, address)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function deriveUserTimeContext(
  capturedAt: string,
  request: ChatAgentRequest,
  profile?: ProfileAggregate | null,
) {
  const timeZone =
    request.clientTimeContext?.timeZone?.trim() ||
    profile?.identity.timeZone?.trim() ||
    "UTC";
  const locale =
    request.clientTimeContext?.locale?.trim() ||
    profile?.identity.locale?.trim() ||
    null;

  let localTime = capturedAt;
  try {
    localTime = new Intl.DateTimeFormat(locale ?? "en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(new Date(capturedAt));
  } catch {
    localTime = capturedAt;
  }

  return { timeZone, locale, localTime };
}

function getWalletLabel(wallet: WalletPortfolio): string {
  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? (wallet.metadata as Record<string, unknown>)
      : null;
  const metadataLabel =
    typeof metadata?.label === "string" && metadata.label.trim().length > 0
      ? metadata.label.trim()
      : null;
  const customLabel = typeof wallet.label === "string" && wallet.label.trim().length > 0 ? wallet.label.trim() : null;
  const providerLabel =
    typeof wallet.providerName === "string" && wallet.providerName.trim().length > 0
      ? wallet.providerName.trim()
      : null;

  return metadataLabel ?? customLabel ?? providerLabel ?? "Wallet";
}

function inferWalletPlatform(wallet: WalletPortfolio): "evm" | "solana" | null {
  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? (wallet.metadata as Record<string, unknown>)
      : null;
  const explicitPlatform = typeof metadata?.platform === "string" ? metadata.platform.trim().toLowerCase() : "";
  if (explicitPlatform === "evm" || explicitPlatform === "solana") {
    return explicitPlatform;
  }
  const kind = typeof metadata?.kind === "string" ? metadata.kind.trim().toLowerCase() : "";
  if (kind === "evm" || kind === "solana") {
    return kind;
  }
  const address = wallet.address?.trim() ?? "";
  if (address.startsWith("0x")) {
    return "evm";
  }
  if (address.length >= 32 && address.length <= 44) {
    return "solana";
  }
  return null;
}

function inferWalletChainId(wallet: WalletPortfolio): number | null {
  const metadata =
    wallet.metadata && typeof wallet.metadata === "object" && !Array.isArray(wallet.metadata)
      ? (wallet.metadata as Record<string, unknown>)
      : null;

  return toFiniteNumber(metadata?.chainId) ?? toFiniteNumber(metadata?.chain_id) ?? null;
}

function buildProfileWalletDescriptors(
  wallets: WalletPortfolio[],
  request: ChatAgentRequest,
): WalletDescriptor[] {
  const selectedAddress = request.walletContext?.selected?.address ?? null;
  const selectedPlatform = request.walletContext?.selected?.platform ?? null;
  const descriptors: WalletDescriptor[] = [];

  for (const wallet of wallets) {
    const address = wallet.address?.trim() ?? "";
    if (!address) {
      continue;
    }

    const platform = inferWalletPlatform(wallet);
    if (!platform) {
      continue;
    }

    descriptors.push({
      walletId: wallet.walletId,
      label: getWalletLabel(wallet),
      address,
      platform,
      chainId: inferWalletChainId(wallet),
      source: "profile",
      isSelected:
        Boolean(selectedAddress) &&
        platform === selectedPlatform &&
        normalizeWalletAddress(platform, address) === normalizeWalletAddress(platform, selectedAddress ?? ""),
    });
  }

  return descriptors;
}

function buildRequestWalletDescriptors(request: ChatAgentRequest): WalletDescriptor[] {
  const descriptors: WalletDescriptor[] = [];
  const selected = request.walletContext?.selected;
  const evm = request.walletContext?.evm;
  const solana = request.walletContext?.solana;

  if (selected?.address && (selected.platform === "evm" || selected.platform === "solana")) {
    descriptors.push({
      walletId: `request:selected:${descriptorKey(selected.platform, selected.address)}`,
      label: selected.label?.trim() || "Selected Wallet",
      address: selected.address,
      platform: selected.platform,
      chainId: selected.platform === "evm" ? selected.chainId ?? evm?.chainId ?? null : 101,
      source: "request",
      isSelected: true,
    });
  }

  if (evm?.address) {
    descriptors.push({
      walletId: `request:evm:${descriptorKey("evm", evm.address)}`,
      label: "Connected EVM Wallet",
      address: evm.address,
      platform: "evm",
      chainId: evm.chainId ?? null,
      source: "request",
      isSelected:
        Boolean(selected?.address) &&
        selected?.platform === "evm" &&
        normalizeWalletAddress("evm", evm.address) === normalizeWalletAddress("evm", selected.address),
    });
  }

  if (solana?.address) {
    descriptors.push({
      walletId: `request:solana:${descriptorKey("solana", solana.address)}`,
      label: "Connected Solana Wallet",
      address: solana.address,
      platform: "solana",
      chainId: 101,
      source: "request",
      isSelected:
        Boolean(selected?.address) &&
        selected?.platform === "solana" &&
        normalizeWalletAddress("solana", solana.address) === normalizeWalletAddress("solana", selected.address),
    });
  }

  return descriptors;
}

function dedupeDescriptors(descriptors: WalletDescriptor[]): WalletDescriptor[] {
  const byKey = new Map<string, WalletDescriptor>();

  for (const descriptor of descriptors) {
    const key = descriptorKey(descriptor.platform, descriptor.address);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, descriptor);
      continue;
    }

    byKey.set(key, {
      ...existing,
      walletId: existing.source === "profile" ? existing.walletId : descriptor.walletId,
      label:
        existing.source === "profile" && existing.label !== "Wallet"
          ? existing.label
          : descriptor.label || existing.label,
      chainId: existing.chainId ?? descriptor.chainId,
      source: existing.source === "profile" ? "profile" : descriptor.source,
      isSelected: existing.isSelected || descriptor.isSelected,
    });
  }

  return Array.from(byKey.values());
}

function mapAdhocAssetsToTokens(descriptor: WalletDescriptor, assets: Awaited<ReturnType<typeof WalletAssetsService.syncAssets>>["assets"]): AggregatedToken[] {
  return assets.map((asset) => ({
    walletId: descriptor.walletId,
    walletLabel: descriptor.label,
    walletAddress: descriptor.address,
    chainId: asset.chainId ?? descriptor.chainId,
    platform: asset.platform,
    contract: asset.contract,
    symbol: asset.symbol ?? null,
    name: asset.name ?? null,
    decimals: typeof asset.decimals === "number" ? asset.decimals : null,
    balance: typeof asset.uiAmount === "number" ? asset.uiAmount : 0,
    priceUsd: typeof asset.priceUsd === "number" ? asset.priceUsd : null,
    valueUsd: typeof asset.valueUsd === "number" ? asset.valueUsd : null,
    priceChange24h: typeof asset.change24hPercent === "number" ? asset.change24hPercent : null,
    logoURI: asset.logoURI ?? null,
  }));
}

function dedupeTokens(tokens: AggregatedToken[]): AggregatedToken[] {
  const seen = new Map<string, AggregatedToken>();

  for (const token of tokens) {
    const platform = token.platform === "solana" ? "solana" : "evm";
    const contract = token.contract?.toLowerCase() ?? "native";
    const key = `${descriptorKey(platform, token.walletAddress)}:${token.chainId ?? "na"}:${contract}`;
    const existing = seen.get(key);
    if (!existing || (token.valueUsd ?? 0) > (existing.valueUsd ?? 0)) {
      seen.set(key, token);
    }
  }

  return Array.from(seen.values());
}

function approximate24hPnlUsd(valueUsd: number | null | undefined, change24hPct: number | null | undefined): number | null {
  if (valueUsd == null || !Number.isFinite(valueUsd) || change24hPct == null || !Number.isFinite(change24hPct)) {
    return null;
  }

  const denominator = 1 + change24hPct / 100;
  if (!Number.isFinite(denominator) || denominator === 0) {
    return null;
  }

  const previousValue = valueUsd / denominator;
  const delta = valueUsd - previousValue;
  return Number.isFinite(delta) ? delta : null;
}

async function captureMissingRequestWalletTokens(
  descriptors: WalletDescriptor[],
  knownDescriptorKeys: Set<string>,
): Promise<AggregatedToken[]> {
  const missingDescriptors = descriptors.filter((descriptor) => !knownDescriptorKeys.has(descriptorKey(descriptor.platform, descriptor.address)));
  if (missingDescriptors.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    missingDescriptors.map(async (descriptor) => {
      const result = await WalletAssetsService.syncAssets(
        null,
        descriptor.walletId,
        descriptor.address,
        descriptor.chainId ?? (descriptor.platform === "solana" ? 101 : 1),
        false,
      );

      if (!result.success) {
        return [] as AggregatedToken[];
      }

      return mapAdhocAssetsToTokens(descriptor, result.assets);
    }),
  );

  const tokens: AggregatedToken[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      tokens.push(...result.value);
    }
  }
  return tokens;
}

async function computePortfolioSnapshot(
  userId: string | null | undefined,
  request: ChatAgentRequest,
): Promise<HoldingsComputation> {
  const [profileWallets, holdingsAggregate] = await Promise.all([
    userId ? resolveUserWallets(userId).catch(() => [] as WalletPortfolio[]) : Promise.resolve([] as WalletPortfolio[]),
    userId
      ? getWalletHoldingsAggregate(userId).catch(() => ({
          generatedAt: new Date().toISOString(),
          tokens: [],
          nfts: [],
          ens: [],
        }))
      : Promise.resolve({
          generatedAt: new Date().toISOString(),
          tokens: [],
          nfts: [],
          ens: [],
        }),
  ]);

  const profileDescriptors = buildProfileWalletDescriptors(profileWallets, request);
  const requestDescriptors = buildRequestWalletDescriptors(request);
  const descriptors = dedupeDescriptors([...profileDescriptors, ...requestDescriptors]);

  const knownDescriptorKeys = new Set<string>([
    ...profileDescriptors.map((descriptor) => descriptorKey(descriptor.platform, descriptor.address)),
    ...(holdingsAggregate.tokens ?? []).map((token) =>
      descriptorKey(token.platform === "solana" ? "solana" : "evm", token.walletAddress),
    ),
  ]);
  const extraTokens = await captureMissingRequestWalletTokens(
    requestDescriptors,
    knownDescriptorKeys,
  );
  const mergedTokens = dedupeTokens([...(holdingsAggregate.tokens ?? []), ...extraTokens]);

  return {
    descriptors,
    tokens: mergedTokens,
  };
}

async function captureCoinGeckoWsPrices(sessionId: string | null | undefined) {
  let snapshots = coingeckoWS.getLatestPrices([...COINGECKO_COIN_IDS]);
  const missingIds = COINGECKO_COIN_IDS.filter((coinId) => !snapshots[coinId]);

  if (missingIds.length === 0 || coingeckoWS.isTemporarilyDisabled()) {
    return snapshots;
  }

  const tempClientId = `chat-start:${sessionId ?? Date.now().toString(36)}`;

  try {
    coingeckoWS.upsertSubscription(tempClientId, [...COINGECKO_COIN_IDS], "usd");
    const deadline = Date.now() + TEMP_WS_WAIT_MS;

    while (Date.now() < deadline) {
      await sleep(TEMP_WS_POLL_MS);
      snapshots = coingeckoWS.getLatestPrices([...COINGECKO_COIN_IDS]);
      const unresolved = COINGECKO_COIN_IDS.filter((coinId) => !snapshots[coinId]);
      if (unresolved.length === 0) {
        break;
      }
    }
  } catch (error) {
    logger.warn("[chat-start-snapshot] CoinGecko WS subscription failed", error);
  } finally {
    coingeckoWS.removeSubscription(tempClientId);
  }

  return snapshots;
}

function mapCoinGeckoPrice(
  coinId: CoinGeckoCoinId,
  symbol: string,
  wsPrice: CoinGeckoWsPriceUpdate | undefined,
  apiPrice: { usd?: number; usd_24h_change?: number } | undefined,
): ChatStartPricePoint {
  if (wsPrice) {
    return {
      coinId,
      symbol,
      priceUsd: wsPrice.price,
      change24hPct: wsPrice.change24hPct,
      marketCapUsd: wsPrice.marketCapUsd,
      volume24hUsd: wsPrice.volume24hUsd,
      source: "coingecko_ws",
      lastUpdatedAt: wsPrice.lastUpdatedAt ? new Date(wsPrice.lastUpdatedAt).toISOString() : null,
    };
  }

  if (apiPrice && typeof apiPrice.usd === "number") {
    return {
      coinId,
      symbol,
      priceUsd: apiPrice.usd,
      change24hPct: typeof apiPrice.usd_24h_change === "number" ? apiPrice.usd_24h_change : null,
      marketCapUsd: null,
      volume24hUsd: null,
      source: "coingecko_api",
      lastUpdatedAt: null,
    };
  }

  return {
    coinId,
    symbol,
    priceUsd: null,
    change24hPct: null,
    marketCapUsd: null,
    volume24hUsd: null,
    source: "unavailable",
    lastUpdatedAt: null,
  };
}

async function captureMarketPrices(sessionId: string | null | undefined): Promise<Record<PriceKey, ChatStartPricePoint>> {
  const wsSnapshots = await captureCoinGeckoWsPrices(sessionId);
  const missingIds = COINGECKO_COIN_IDS.filter((coinId) => !wsSnapshots[coinId]);
  const apiPrices = missingIds.length > 0 ? await getCoinPricesByIds([...missingIds]) : {};

  return {
    eth: mapCoinGeckoPrice("ethereum", "ETH", wsSnapshots.ethereum, apiPrices.ethereum),
    btc: mapCoinGeckoPrice("bitcoin", "BTC", wsSnapshots.bitcoin, apiPrices.bitcoin),
    sol: mapCoinGeckoPrice("solana", "SOL", wsSnapshots.solana, apiPrices.solana),
    bnb: mapCoinGeckoPrice("binancecoin", "BNB", wsSnapshots.binancecoin, apiPrices.binancecoin),
  };
}

async function captureEvmGasSnapshot(): Promise<Record<EvmGasNetworkKey, ChatStartGasPoint>> {
  let rpcByChainId = new Map<number, string>();
  try {
    rpcByChainId = new Map(getSafeTargetChains().map((chain) => [chain.chainId, chain.rpcUrl]));
  } catch (error) {
    logger.warn("[chat-start-snapshot] Failed to resolve Safe RPC chain map", error);
  }

  const entries = await Promise.all(
    EVM_GAS_NETWORKS.map(async (network) => {
      const rpcUrl = rpcByChainId.get(network.chainId) ?? network.chain.rpcUrls.default.http[0];
      if (!rpcUrl) {
        return [
          network.key,
          {
            label: network.label,
            gasPriceGwei: null,
            maxFeePerGasGwei: null,
            maxPriorityFeePerGasGwei: null,
            source: "unavailable",
          } satisfies ChatStartGasPoint,
        ] as const;
      }

      try {
        const client = createPublicClient({
          chain: network.chain,
          transport: http(rpcUrl),
        });
        type FeeData = {
          gasPrice?: bigint;
          maxFeePerGas?: bigint;
          maxPriorityFeePerGas?: bigint;
        };

        const [gasPrice, feeData] = await Promise.all([
          withTimeout(client.getGasPrice(), 3_500, null as bigint | null),
          withTimeout(
            client.estimateFeesPerGas().catch(() => null as FeeData | null),
            3_500,
            null as FeeData | null,
          ),
        ]);

        return [
          network.key,
          {
            label: network.label,
            gasPriceGwei: gasPrice != null ? Number(formatUnits(gasPrice, 9)) : feeData?.gasPrice != null ? Number(formatUnits(feeData.gasPrice, 9)) : null,
            maxFeePerGasGwei: feeData?.maxFeePerGas != null ? Number(formatUnits(feeData.maxFeePerGas, 9)) : null,
            maxPriorityFeePerGasGwei:
              feeData?.maxPriorityFeePerGas != null
                ? Number(formatUnits(feeData.maxPriorityFeePerGas, 9))
                : null,
            source: gasPrice != null || feeData != null ? "rpc" : "unavailable",
          } satisfies ChatStartGasPoint,
        ] as const;
      } catch (error) {
        logger.warn("[chat-start-snapshot] EVM gas snapshot failed", {
          chainId: network.chainId,
          error: error instanceof Error ? error.message : String(error),
        });
        return [
          network.key,
          {
            label: network.label,
            gasPriceGwei: null,
            maxFeePerGasGwei: null,
            maxPriorityFeePerGasGwei: null,
            source: "unavailable",
          } satisfies ChatStartGasPoint,
        ] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<EvmGasNetworkKey, ChatStartGasPoint>;
}

async function captureSolanaPriorityFee(): Promise<SolanaPriorityFeePoint> {
  const heliusApiKey =
    process.env.HELIUS_API_KEY?.trim() ||
    process.env.MCP_HELIUS_API_KEY?.trim() ||
    "";

  if (heliusApiKey) {
    try {
      const response = await withTimeout(
        fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "chat-start-priority-fee",
            method: "getPriorityFeeEstimate",
            params: [
              {
                options: {
                  priorityLevel: SOLANA_PRIORITY_FEE_DEFAULT_LEVEL,
                },
              },
            ],
          }),
        }).then((res) => res.json() as Promise<{ result?: { priorityFeeEstimate?: unknown } }>),
        3_500,
        null as { result?: { priorityFeeEstimate?: unknown } } | null,
      );

      const microLamports = toFiniteNumber(response?.result?.priorityFeeEstimate);
      if (microLamports != null) {
        return {
          label: "Solana",
          priorityFeeMicroLamports: microLamports,
          priorityLevel: SOLANA_PRIORITY_FEE_DEFAULT_LEVEL,
          source: "helius_rpc",
        };
      }
    } catch (error) {
      logger.warn("[chat-start-snapshot] Helius priority fee lookup failed", error);
    }
  }

  const solanaRpcUrl =
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    "";

  if (!solanaRpcUrl) {
    return {
      label: "Solana",
      priorityFeeMicroLamports: null,
      priorityLevel: null,
      source: "unavailable",
    };
  }

  try {
    const connection = new Connection(solanaRpcUrl, "confirmed");
    const recentFees = await withTimeout(
      connection.getRecentPrioritizationFees(),
      3_500,
      [] as Array<{ prioritizationFee: number }>,
    );
    const positiveFees = recentFees
      .map((entry) => entry.prioritizationFee)
      .filter((fee): fee is number => Number.isFinite(fee) && fee > 0)
      .sort((a, b) => a - b);

    if (positiveFees.length > 0) {
      const medianFee = positiveFees[Math.floor(positiveFees.length / 2)] ?? null;
      return {
        label: "Solana",
        priorityFeeMicroLamports: medianFee,
        priorityLevel: "recent-median",
        source: "solana_rpc",
      };
    }
  } catch (error) {
    logger.warn("[chat-start-snapshot] Solana priority fee fallback failed", error);
  }

  return {
    label: "Solana",
    priorityFeeMicroLamports: null,
    priorityLevel: null,
    source: "unavailable",
  };
}

async function captureMarketSnapshot(sessionId: string | null | undefined) {
  const [prices, globalMarket, fearGreed, gas, solanaPriorityFee] = await Promise.all([
    captureMarketPrices(sessionId),
    getGlobalMarketData().catch(() => null),
    getMarketSentiment().catch(() => null),
    captureEvmGasSnapshot(),
    captureSolanaPriorityFee(),
  ]);

  return {
    prices,
    totalCryptoMarketCapUsd: globalMarket?.data?.total_market_cap?.usd ?? null,
    fearGreed: {
      score: fearGreed?.data?.score ?? null,
      classification: fearGreed?.data?.classification ?? null,
      updatedAt: fearGreed?.data?.updatedAt ?? null,
      source: fearGreed?.data ? ("coinmarketcap" as const) : ("unavailable" as const),
    },
    gas,
    solanaPriorityFee,
  };
}

function formatPriceLine(prices: Record<PriceKey, ChatStartPricePoint>) {
  const ordered: PriceKey[] = ["eth", "btc", "sol", "bnb"];
  return ordered
    .map((key) => {
      const price = prices[key];
      if (price.priceUsd == null) {
        return `${price.symbol}: unavailable`;
      }
      return `${price.symbol} ${formatUsd(price.priceUsd)} (${formatPct(price.change24hPct)})`;
    })
    .join(" | ");
}

function formatGasLine(
  gas: Record<EvmGasNetworkKey, ChatStartGasPoint>,
  solanaPriorityFee: SolanaPriorityFeePoint,
) {
  const evmParts = EVM_GAS_NETWORKS.map((network) => {
    const point = gas[network.key];
    if (!point || point.gasPriceGwei == null) {
      return `${network.label} n/a`;
    }
    const primary =
      point.maxFeePerGasGwei != null && point.maxPriorityFeePerGasGwei != null
        ? `${point.maxFeePerGasGwei.toFixed(2)} gwei (priority ${point.maxPriorityFeePerGasGwei.toFixed(2)})`
        : `${point.gasPriceGwei.toFixed(2)} gwei`;
    return `${network.label} ${primary}`;
  });

  const solanaPart =
    solanaPriorityFee.priorityFeeMicroLamports != null
      ? `Solana ${Math.round(solanaPriorityFee.priorityFeeMicroLamports)} micro-lamports/CU`
      : "Solana n/a";

  return [...evmParts, solanaPart].join(" | ");
}

function buildPortfolioSummary(holdings: HoldingsComputation, request: ChatAgentRequest) {
  const descriptorMap = new Map<string, WalletDescriptor>();
  for (const descriptor of holdings.descriptors) {
    descriptorMap.set(descriptorKey(descriptor.platform, descriptor.address), descriptor);
  }

  for (const token of holdings.tokens) {
    const platform = token.platform === "solana" ? "solana" : "evm";
    const key = descriptorKey(platform, token.walletAddress);
    if (!descriptorMap.has(key)) {
      descriptorMap.set(key, {
        walletId: token.walletId,
        label: token.walletLabel || "Wallet",
        address: token.walletAddress,
        platform,
        chainId: token.chainId ?? null,
        source: "profile",
        isSelected:
          Boolean(request.walletContext?.selected?.address) &&
          request.walletContext?.selected?.platform === platform &&
          normalizeWalletAddress(platform, token.walletAddress) ===
            normalizeWalletAddress(platform, request.walletContext?.selected?.address ?? ""),
      });
    }
  }

  const descriptors = Array.from(descriptorMap.values());
  const tokensByWallet = new Map<string, AggregatedToken[]>();

  for (const token of holdings.tokens) {
    const tokenPlatform = token.platform === "solana" ? "solana" : "evm";
    const key = descriptorKey(tokenPlatform, token.walletAddress);
    const list = tokensByWallet.get(key) ?? [];
    list.push(token);
    tokensByWallet.set(key, list);
  }

  const walletSummaries: PortfolioWalletSummary[] = descriptors.map((descriptor) => {
    const tokens = tokensByWallet.get(descriptorKey(descriptor.platform, descriptor.address)) ?? [];
    const sortedTokens = [...tokens].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
    const netWorthUsd = sortedTokens.reduce((sum, token) => sum + (token.valueUsd ?? 0), 0);
    const approxPnl24hUsd = sortedTokens.reduce((sum, token) => {
      const delta = approximate24hPnlUsd(token.valueUsd, token.priceChange24h);
      return sum + (delta ?? 0);
    }, 0);

    return {
      walletId: descriptor.walletId,
      label: descriptor.label,
      address: descriptor.address,
      platform: descriptor.platform,
      chainId: descriptor.chainId,
      source: descriptor.source,
      isSelected: descriptor.isSelected,
      netWorthUsd: netWorthUsd > 0 ? netWorthUsd : null,
      approxPnl24hUsd: approxPnl24hUsd !== 0 ? approxPnl24hUsd : null,
      topHoldings: sortedTokens
        .filter((token) => (token.valueUsd ?? 0) > 0)
        .slice(0, 3)
        .map((token) => ({
          symbol: token.symbol ?? token.name ?? "Asset",
          valueUsd: token.valueUsd ?? 0,
        })),
    };
  });

  const totalNetWorthUsd = walletSummaries.reduce((sum, wallet) => sum + (wallet.netWorthUsd ?? 0), 0);
  const approxPnl24hUsd = walletSummaries.reduce((sum, wallet) => sum + (wallet.approxPnl24hUsd ?? 0), 0);

  const topHoldings = Array.from(
    holdings.tokens.reduce((map, token) => {
      const symbol = token.symbol ?? token.name ?? "Asset";
      const platform = token.platform === "solana" ? "solana" : "evm";
      const key = `${platform}:${symbol.toUpperCase()}`;
      const existing = map.get(key);
      const nextValue = (existing?.valueUsd ?? 0) + (token.valueUsd ?? 0);
      map.set(key, { symbol, valueUsd: nextValue, platform });
      return map;
    }, new Map<string, PortfolioHoldingSummary>()),
  )
    .map(([, holding]) => holding)
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 6);

  const selectedWalletAddress =
    request.walletContext?.selected?.address ??
    walletSummaries.find((wallet) => wallet.isSelected)?.address ??
    null;

  return {
    selectedWalletAddress,
    walletCount: walletSummaries.length,
    totalNetWorthUsd: totalNetWorthUsd > 0 ? totalNetWorthUsd : null,
    approxPnl24hUsd: approxPnl24hUsd !== 0 ? approxPnl24hUsd : null,
    wallets: walletSummaries.sort((a, b) => (b.netWorthUsd ?? 0) - (a.netWorthUsd ?? 0)),
    topHoldings,
  };
}

export function formatChatStartMarketContext(snapshot: ChatStartSnapshot): string {
  return [
    `Chat-start market snapshot captured at ${snapshot.capturedAt}. User local time: ${snapshot.user.localTime} (${snapshot.user.timeZone}).`,
    `Prices: ${formatPriceLine(snapshot.market.prices)}.`,
    `Total crypto market cap: ${formatUsd(snapshot.market.totalCryptoMarketCapUsd, { compact: true })}. Fear & Greed: ${
      snapshot.market.fearGreed.score != null
        ? `${snapshot.market.fearGreed.score} ${snapshot.market.fearGreed.classification ?? ""}`.trim()
        : "unavailable"
    }.`,
    `Network fees: ${formatGasLine(snapshot.market.gas, snapshot.market.solanaPriorityFee)}.`,
    "Treat this as the session-start baseline. If the user asks for a live refresh, fetch fresh tool data before answering.",
  ].join("\n");
}

export function formatChatStartPortfolioContext(snapshot: ChatStartSnapshot): string {
  if (snapshot.portfolio.walletCount === 0) {
    return [
      "User portfolio snapshot at chat start: no authenticated or connected wallet holdings were available.",
      "If the user asks for balances or portfolio analysis, use wallet tools to fetch live data.",
    ].join("\n");
  }

  const walletLine = snapshot.portfolio.wallets
    .slice(0, 4)
    .map((wallet) => `${wallet.label} ${formatAddress(wallet.address)}`)
    .join(" | ");
  const holdingsLine = snapshot.portfolio.topHoldings
    .slice(0, 5)
    .map((holding) => `${holding.symbol} ${formatUsd(holding.valueUsd, { compact: true })}`)
    .join(", ");

  return [
    `User portfolio snapshot at chat start: ${snapshot.portfolio.walletCount} wallet(s).`,
    snapshot.portfolio.selectedWalletAddress
      ? `Selected wallet: ${formatAddress(snapshot.portfolio.selectedWalletAddress)}.`
      : "Selected wallet: none.",
    `Wallets: ${walletLine}.`,
    `Net worth: ${formatUsd(snapshot.portfolio.totalNetWorthUsd, { compact: true })}. Approx 24h delta: ${formatUsd(snapshot.portfolio.approxPnl24hUsd, { compact: true })}.`,
    holdingsLine ? `Top holdings: ${holdingsLine}.` : "Top holdings: unavailable.",
    "Use these wallets by default for holdings/net-worth questions unless the user specifies a different wallet. Refresh with live tools before execution advice.",
  ].join("\n");
}

export async function buildChatStartSnapshot(
  params: BuildChatStartSnapshotParams,
): Promise<ChatStartSnapshot | null> {
  const sessionId = params.sessionId?.trim() || null;
  const cacheKey = sessionId ? `chat:start-snapshot:v1:${sessionId}` : null;

  if (cacheKey && isRedisConfigured) {
    const cached = await redis.get<ChatStartSnapshot>(cacheKey).catch(() => null);
    if (cached) {
      return cached;
    }
  }

  const capturedAt = new Date().toISOString();
  const user = deriveUserTimeContext(capturedAt, params.request, params.profile);

  const [market, holdings] = await Promise.all([
    captureMarketSnapshot(sessionId),
    computePortfolioSnapshot(params.userId, params.request),
  ]);

  const portfolio = buildPortfolioSummary(holdings, params.request);

  const snapshot: ChatStartSnapshot = {
    capturedAt,
    user,
    market,
    portfolio,
    promptContext: {
      market: "",
      portfolio: "",
    },
  };

  snapshot.promptContext.market = formatChatStartMarketContext(snapshot);
  snapshot.promptContext.portfolio = formatChatStartPortfolioContext(snapshot);

  if (cacheKey && isRedisConfigured) {
    await redis.set(cacheKey, snapshot, { ex: SESSION_SNAPSHOT_TTL_SECONDS }).catch((error) => {
      logger.warn("[chat-start-snapshot] Failed to cache chat-start snapshot", error);
    });
  }

  return snapshot;
}
