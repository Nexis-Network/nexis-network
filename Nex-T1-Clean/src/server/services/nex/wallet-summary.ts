/**
 * Nex Wallet Summary Service
 * 
 * Fetches wallet token/NFT data using viem and third-party APIs
 * Uses direct viem calls plus indexer APIs for wallet summaries
 * 
 * Domain: Wallets
 * Depends on: viem, helius-client, coingecko, redis
 */

import { mainnet, base, arbitrum, optimism, bsc, polygon, avalanche, linea } from "viem/chains";
import { type Address, createPublicClient, http, formatUnits } from "viem";
import { defaultHeliusClient } from "@/server/services/mcp/helius-client";
import { defaultAlchemyClient } from "@/server/services/mcp/alchemy-client";
import { redis, isRedisConfigured } from "@/server/services/redis";
import { metrics, timeVendor } from "@/server/instrumentation/metrics";
import { getCoinPricesByIds, getTokenPricesByContracts } from "@/server/market/coingecko";
import { isNexAAEnabled } from "@/modules/wallets/nex/env";
import { getCachedNativeBalance } from "@/server/wallets/native-balance-cache";
import {
  resolveCoinGeckoNativeAssetId,
  resolveCoinGeckoPlatformForChain,
} from "@/lib/cdp/cdp-chain-support";
import {
  fetchSolanaNativeBalanceFromRpc,
  fetchSolanaRecentSignaturesFromRpc,
} from "@/server/services/solana/rpc-read";
import { appendNativeSolBalance } from "./solana-wallet-summary-helpers";

// Cache TTLs
const EVM_CACHE_TTL_SECONDS = Number(process.env.EVM_WALLET_CACHE_TTL ?? 120);
const SOLANA_CACHE_TTL_SECONDS = Number(process.env.SOLANA_WALLET_CACHE_TTL ?? 120);
const DEFAULT_FETCH_TIMEOUT_MS = Number(process.env.WALLET_FETCH_TIMEOUT_MS ?? 5000);

// Chain configurations for viem/provider reads
const CHAIN_CONFIGS = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
  56: bsc,
  43114: avalanche,
  59144: linea,
  // Custom chains might not be fully supported by all providers yet, but we include them
} as const;


import { logger } from '@/lib/logger';

export interface EvmTokenRecord {
  chainId: number;
  platform: "evm";
  contract: string | null;
  symbol: string | null;
  name: string | null;
  decimals: number;
  balance: number;
  priceUsd: number | null;
  priceChange24h: number | null;
  valueUsd: number | null;
  logoURI: string | null;
}

export interface EvmSummary {
  tokens: EvmTokenRecord[];
  nfts: Record<string, UntypedJson>[];
  txs: Record<string, UntypedJson>[];
  nextTokensCursor: number | null;
  nextNftsCursor: number | null;
  fetchedAt: string;
}

export interface FetchEvmWalletSummaryOptions {
  tokensCursor?: number;
  nftsCursor?: number;
  limit?: number;
  includeTokens?: boolean;
  includeNfts?: boolean;
  includeTransactions?: boolean;
  transactionLimit?: number;
  skipCache?: boolean;
  fetchTimeoutMs?: number;
  chainIds?: number[];
}

export interface SolSummary {
  tokens: Record<string, UntypedJson>[];
  nfts: Record<string, UntypedJson>[];
  txs: Record<string, UntypedJson>[];
  nextTokensCursor: number | null;
  nextNftsCursor: number | null;
}

export interface FetchSolanaWalletSummaryOptions {
  tokensCursor?: number;
  nftsCursor?: number;
  limit?: number;
  includeTokens?: boolean;
  includeNfts?: boolean;
  includeTransactions?: boolean;
  transactionLimit?: number;
  skipCache?: boolean;
  fetchTimeoutMs?: number;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch {
    // Timeout or error occurred, return fallback value
    clearTimeout(timeoutId!);
    return fallback;
  }
}

function asRecord(value: UntypedJson): Record<string, UntypedJson> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, UntypedJson>)
    : null;
}

function readString(value: UntypedJson): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: UntypedJson): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readToolResult(response: UntypedJson): Record<string, UntypedJson> {
  const root = asRecord(response) ?? {};
  const nestedResponse = asRecord(root.response) ?? {};
  return asRecord(root.toolResult) ?? asRecord(nestedResponse.toolResult) ?? root;
}

function readArray(
  record: Record<string, UntypedJson>,
  keys: string[],
): UntypedJson[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function readChain(chainId: number) {
  return CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS] ?? mainnet;
}

function readNativePrice(
  payload: Record<string, { usd?: number; usd_24h_change?: number }>,
  chainId: number,
): { usd: number | null; usd24hChange: number | null } {
  const coinId = resolveCoinGeckoNativeAssetId("evm", chainId);
  const entry = payload[coinId];
  return {
    usd: typeof entry?.usd === "number" ? entry.usd : null,
    usd24hChange:
      typeof entry?.usd_24h_change === "number" ? entry.usd_24h_change : null,
  };
}

function readAlchemyTokenBalance(
  token: Record<string, UntypedJson>,
  decimals: number,
): number {
  const formatted =
    readNumber(token.balanceFormatted) ??
    readNumber(token.balance_formatted) ??
    readNumber(token.balance) ??
    readNumber(token.amountFormatted) ??
    readNumber(token.amount);
  if (formatted != null) {
    return formatted;
  }

  const raw =
    readString(token.rawBalance) ??
    readString(token.balanceRaw) ??
    readString(token.raw_balance);
  if (!raw) {
    return 0;
  }

  try {
    return Number(formatUnits(BigInt(raw), decimals));
  } catch {
    return 0;
  }
}

function mapAlchemyTokenToRecord(
  token: Record<string, UntypedJson>,
  chainId: number,
  prices: Record<string, { usd?: number; usd_24h_change?: number }>,
): EvmTokenRecord | null {
  const nestedToken = asRecord(token.token) ?? {};
  const contract =
    readString(token.contractAddress) ??
    readString(token.tokenAddress) ??
    readString(nestedToken.contractAddress) ??
    readString(nestedToken.address);
  if (!contract) {
    return null;
  }

  const normalizedContract = contract.toLowerCase();
  const decimals = Math.max(
    0,
    Math.trunc(
      readNumber(token.decimals) ?? readNumber(nestedToken.decimals) ?? 18,
    ),
  );
  const balance = readAlchemyTokenBalance(token, decimals);
  if (!(balance > 0)) {
    return null;
  }

  const price = prices[normalizedContract];
  const priceUsd = typeof price?.usd === "number" ? price.usd : null;
  const priceChange24h =
    typeof price?.usd_24h_change === "number" ? price.usd_24h_change : null;

  return {
    chainId,
    platform: "evm",
    contract: normalizedContract,
    symbol:
      readString(token.symbol) ??
      readString(nestedToken.symbol) ??
      null,
    name:
      readString(token.name) ??
      readString(nestedToken.name) ??
      null,
    decimals,
    balance,
    priceUsd,
    priceChange24h,
    valueUsd: priceUsd != null ? priceUsd * balance : null,
    logoURI:
      readString(token.logo) ??
      readString(token.image) ??
      readString(nestedToken.logo) ??
      null,
  };
}

async function fetchAlchemyTokensForChain(
  address: Address,
  chainId: number,
  fetchTimeoutMs: number,
): Promise<EvmTokenRecord[]> {
  const response = await withTimeout(
    defaultAlchemyClient.invokeRaw("get_tokens_for_owner", {
      address,
      owner: address,
      chainId,
      chain: String(chainId),
      network: String(chainId),
    }),
    fetchTimeoutMs,
    { toolResult: {} } as UntypedJson,
  );

  const record = readToolResult(response as UntypedJson);
  const rawTokens = readArray(record, ["tokens", "balances", "tokenBalances"]);
  if (rawTokens.length === 0) {
    return [];
  }

  const contracts = rawTokens
    .map((entry) => {
      const token = asRecord(entry) ?? {};
      return (
        readString(token.contractAddress) ??
        readString(token.tokenAddress) ??
        readString(asRecord(token.token)?.contractAddress) ??
        readString(asRecord(token.token)?.address)
      );
    })
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  const prices = contracts.length
    ? await timeVendor("coingecko_evm_token_price", () =>
        getTokenPricesByContracts(
          resolveCoinGeckoPlatformForChain(chainId),
          contracts,
        ),
      ).catch(() => ({}))
    : {};

  return rawTokens
    .map((entry) =>
      mapAlchemyTokenToRecord(asRecord(entry) ?? {}, chainId, prices),
    )
    .filter((entry): entry is EvmTokenRecord => entry !== null);
}

async function fetchNativeTokenForChain(
  address: Address,
  chainId: number,
  fetchTimeoutMs: number,
): Promise<EvmTokenRecord | null> {
  const cachedBalance = await getCachedNativeBalance({
    chainKind: "evm",
    address,
    chainId,
  }).catch(() => null);
  const chain = readChain(chainId);
  const liveBalance =
    cachedBalance != null ? null : await getNativeBalance(chainId, address);
  const balance =
    cachedBalance ??
    (liveBalance
      ? Number(formatUnits(liveBalance.balance, liveBalance.decimals))
      : 0);
  if (!(balance > 0)) {
    return null;
  }

  const pricePayload = await withTimeout(
    timeVendor("coingecko_evm_native_price", () =>
      getCoinPricesByIds([resolveCoinGeckoNativeAssetId("evm", chainId)]),
    ).catch(() => ({})),
    fetchTimeoutMs,
    {},
  );
  const { usd, usd24hChange } = readNativePrice(
    pricePayload as Record<string, { usd?: number; usd_24h_change?: number }>,
    chainId,
  );

  return {
    chainId,
    platform: "evm",
    contract: null,
    symbol: liveBalance?.symbol ?? chain.nativeCurrency.symbol,
    name: chain.nativeCurrency.name,
    decimals: liveBalance?.decimals ?? chain.nativeCurrency.decimals,
    balance,
    priceUsd: usd,
    priceChange24h: usd24hChange,
    valueUsd: usd != null ? usd * balance : null,
    logoURI: null,
  };
}

async function fetchAlchemyNftsForChain(
  address: Address,
  chainId: number,
  limit: number,
  fetchTimeoutMs: number,
): Promise<Record<string, UntypedJson>[]> {
  const response = await withTimeout(
    defaultAlchemyClient.invokeRaw("get_nfts_for_owner", {
      address,
      owner: address,
      chainId,
      chain: String(chainId),
      network: String(chainId),
      pageSize: limit,
      page_size: limit,
      withMetadata: true,
      with_metadata: true,
    }),
    fetchTimeoutMs,
    { toolResult: {} } as UntypedJson,
  );

  const record = readToolResult(response as UntypedJson);
  const rawNfts = readArray(record, ["ownedNfts", "nfts", "items"]);
  return rawNfts.flatMap((entry) => {
      const nft = asRecord(entry);
      if (!nft) {
        return [];
      }
      const contract = asRecord(nft.contract) ?? {};
      const image = asRecord(nft.image) ?? {};
      const raw = asRecord(nft.raw) ?? {};
      const metadata = asRecord(raw.metadata) ?? {};
      const collection = asRecord(nft.collection) ?? {};
      return [{
        chainId,
        token_address: (
          readString(contract.address) ??
          readString(nft.contractAddress)
        )?.toLowerCase() ?? null,
        token_id: readString(nft.tokenId) ?? readString(nft.token_id),
        amount: readString(nft.balance) ?? "1",
        name: readString(nft.name) ?? readString(nft.title),
        symbol: readString(contract.symbol) ?? readString(collection.name),
        description:
          readString(nft.description) ?? readString(metadata.description),
        normalized_metadata: {
          description:
            readString(nft.description) ?? readString(metadata.description),
          image:
            readString(image.cachedUrl) ??
            readString(image.originalUrl) ??
            readString(metadata.image),
          animation_url:
            readString(metadata.animation_url) ??
            readString(metadata.animationUrl),
        },
        media: {
          original_media_url:
            readString(image.cachedUrl) ??
            readString(image.originalUrl) ??
            readString(metadata.image),
        },
      } satisfies Record<string, UntypedJson>];
    });
}

// Helper to fetch native balance
async function getNativeBalance(chainId: number, address: Address) {
  const chain = Object.values(CHAIN_CONFIGS).find((c) => c.id === chainId);
  if (!chain) return null;

  try {
    const client = createPublicClient({
      chain,
      transport: http(),
    });
    const balance = await withTimeout(client.getBalance({ address }), 5000, 0n);
    
    return {
      balance,
      decimals: chain.nativeCurrency.decimals,
      symbol: chain.nativeCurrency.symbol,
    };
  } catch (error) {
    logger.error(`Failed to fetch native balance for chain ${chainId}`, error);
    return null;
  }
}

/**
 * Fetch EVM wallet summary using Alchemy, viem, and CoinGecko.
 */
export async function fetchNexEvmWalletSummary(
  rawAddress: string,
  options: FetchEvmWalletSummaryOptions = {}
): Promise<EvmSummary> {
  const address = (rawAddress ?? "").toLowerCase() as Address;
  if (!address || address.length < 10 || !isNexAAEnabled()) {
    return { 
        tokens: [], 
        nfts: [], 
        txs: [], 
        nextTokensCursor: null, 
        nextNftsCursor: null,
        fetchedAt: new Date().toISOString()
    };
  }

  const tokensCursor = Number(options.tokensCursor ?? 0) || 0;
  const limit = Math.min(50, Math.max(10, Number(options.limit ?? 25) || 25));
  const includeTokens = options.includeTokens ?? true;
  const includeNfts = options.includeNfts ?? false; // Default off for now unless requested
  const skipCache = options.skipCache ?? false;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const chainIds = options.chainIds ?? Object.keys(CHAIN_CONFIGS).map(Number);
  const cacheKey = `nex:evm:summary:v2:${address}`;

  // Check cache first
  if (!skipCache && isRedisConfigured) {
    try {
      const cached = await redis.get<EvmSummary>(cacheKey);
      if (cached) {
        metrics.cacheHit("nex_evm_summary");
        return cached;
      }
    } catch {
      // Ignore cache errors
    }
  }
  metrics.cacheMiss("nex_evm_summary");

  const tokens: EvmTokenRecord[] = [];
  const _nfts: Record<string, UntypedJson>[] = [];
  const _txs: Record<string, UntypedJson>[] = [];

  const chainResults = await Promise.all(
    chainIds.map(async (chainId) => {
      const chainTokens = includeTokens
        ? await fetchAlchemyTokensForChain(address, chainId, fetchTimeoutMs).catch(
            (error) => {
              logger.warn("nex_evm_alchemy_tokens_failed", {
                address,
                chainId,
                error: error instanceof Error ? error.message : String(error),
              });
              return [];
            },
          )
        : [];
      const nativeToken = includeTokens
        ? await fetchNativeTokenForChain(address, chainId, fetchTimeoutMs).catch(
            (error) => {
              logger.warn("nex_evm_native_balance_failed", {
                address,
                chainId,
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            },
          )
        : null;
      const chainNfts = includeNfts
        ? await fetchAlchemyNftsForChain(address, chainId, limit, fetchTimeoutMs).catch(
            (error) => {
              logger.warn("nex_evm_alchemy_nfts_failed", {
                address,
                chainId,
                error: error instanceof Error ? error.message : String(error),
              });
              return [];
            },
          )
        : [];

      return { chainTokens, nativeToken, chainNfts };
    }),
  );

  for (const result of chainResults) {
    tokens.push(...result.chainTokens);
    if (result.nativeToken) {
      tokens.push(result.nativeToken);
    }
    _nfts.push(...result.chainNfts);
  }

  const paginatedTokens = tokens.slice(tokensCursor, tokensCursor + limit);
  const nextTokensCursor = tokensCursor + limit < tokens.length ? tokensCursor + limit : null;
  const fetchedAt = new Date().toISOString();

  const summary: EvmSummary = {
    tokens: paginatedTokens,
    nfts: _nfts.slice(options.nftsCursor ?? 0, (options.nftsCursor ?? 0) + limit), 
    txs: _txs.slice(0, 50).sort((a,b) => (new Date(String(b.block_timestamp ?? "")).getTime() - new Date(String(a.block_timestamp ?? "")).getTime())),
    nextTokensCursor,
    nextNftsCursor: null,
    fetchedAt,
  };

  if (isRedisConfigured && tokens.length > 0) {
    redis.set(cacheKey, summary, { ex: EVM_CACHE_TTL_SECONDS }).catch(() => {});
  }

  return summary;
}

/**
 * Fetch Solana wallet summary using Helius
 */
export async function fetchNexSolanaWalletSummary(
  address: string,
  options: FetchSolanaWalletSummaryOptions = {}
): Promise<SolSummary> {
  const owner = (address ?? "").trim();
  if (!owner || owner.length < 10) {
    return { tokens: [], nfts: [], txs: [], nextTokensCursor: null, nextNftsCursor: null };
  }

  const tokensCursor = Number(options.tokensCursor ?? 0) || 0;
  const nftsCursor = Number(options.nftsCursor ?? 0) || 0;
  const limit = Math.min(50, Math.max(10, Number(options.limit ?? 25) || 25));
  const includeTokens = options.includeTokens ?? true;
  const includeNfts = options.includeNfts ?? true;
  const includeTransactions = options.includeTransactions ?? true;
  const transactionLimit = Math.min(100, Math.max(10, Number(options.transactionLimit ?? limit) || limit));
  const skipCache = options.skipCache ?? false;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

  const cacheKey = `nex:sol:summary:v2:${owner}`;

  // Check cache first
  if (!skipCache && isRedisConfigured) {
    try {
      const cached = await redis.get<SolSummary>(cacheKey);
      if (cached) {
        metrics.cacheHit("nex_sol_summary");
        return cached;
      }
    } catch {
      // Ignore cache errors
    }
  }
  metrics.cacheMiss("nex_sol_summary");

  // Parallel fetch token accounts and assets
  const [tokenAccounts, assets, nativeBalance] = await Promise.all([
    includeTokens
      ? withTimeout(
          timeVendor("helius_get_token_accounts_by_owner", () =>
            defaultHeliusClient.invokeRaw("helius_get_token_accounts_by_owner", { owner })
          ).then((response) => {
            const r = response as Record<string, UntypedJson> | null;
            const toolResult = r?.toolResult as Record<string, UntypedJson> | undefined;
            return (Array.isArray(toolResult?.result) ? toolResult.result : []) as UntypedJson[];
          }),
          fetchTimeoutMs,
          []
        )
      : Promise.resolve([]),
    includeNfts
      ? withTimeout(
          timeVendor("helius_get_assets_by_owner", () =>
            defaultHeliusClient.invokeRaw("helius_get_assets_by_owner", { ownerAddress: owner, page: 1 })
          ).then((response) => {
            const r = response as Record<string, UntypedJson> | null;
            const toolResult = r?.toolResult as Record<string, UntypedJson> | undefined;
            return (Array.isArray(toolResult?.items) ? toolResult.items : []) as UntypedJson[];
          }),
          fetchTimeoutMs,
          []
        )
      : Promise.resolve([]),
    includeTokens
      ? (async () => {
          const cachedBalance = await getCachedNativeBalance({
            chainKind: "solana",
            address: owner,
          }).catch(() => null);
          if (cachedBalance !== null) {
            return cachedBalance;
          }
          return fetchSolanaNativeBalanceFromRpc(owner);
        })()
      : Promise.resolve(null),
  ]);

  // Normalize token data
  const normalizeToken = (acc: UntypedJson): Record<string, UntypedJson> | null => {
    const r = (acc && typeof acc === "object" ? acc : {}) as Record<string, UntypedJson>;
    const account = (r.account && typeof r.account === "object" ? r.account : {}) as Record<string, UntypedJson>;
    const accountData = (account.data && typeof account.data === "object" ? account.data : {}) as Record<string, UntypedJson>;
    const parsed = (accountData.parsed && typeof accountData.parsed === "object" ? accountData.parsed : {}) as Record<string, UntypedJson>;
    const info = (parsed.info && typeof parsed.info === "object" ? parsed.info : {}) as Record<string, UntypedJson>;
    const tokenAmount = (info.tokenAmount && typeof info.tokenAmount === "object" ? info.tokenAmount : {}) as Record<string, UntypedJson>;
    const amount = Number(tokenAmount.uiAmount ?? 0);
    const decimals = Number(tokenAmount.decimals ?? 0);
    const mint = (String(info.mint ?? r.pubkey ?? "")).toString();
    if (!(amount > 0)) return null;
    return { mint, amount, decimals, logo: null, symbol: null, name: null, priceUsd: null, valueUsd: null };
  };

  const tokensAll = includeTokens
    ? appendNativeSolBalance(
        (Array.isArray(tokenAccounts) ? tokenAccounts : [])
          .map(normalizeToken)
          .filter((t): t is Record<string, UntypedJson> => t !== null),
        nativeBalance,
        null,
      )
    : [];

  const tokens = tokensAll.slice(tokensCursor, tokensCursor + limit);
  const nextTokensCursor = tokensCursor + limit < tokensAll.length ? tokensCursor + limit : null;

  // Get prices for tokens
  if (includeTokens && tokens.length) {
    const mints = Array.from(new Set(tokens.map((t) => t.mint as string).filter(Boolean)));
    if (mints.length) {
      try {
        const requiresNativeSolPrice = tokens.some((token) => token.isNative === true);
        const [prices, nativeSolPrice] = await Promise.all([
          timeVendor("coingecko_spl_price", () =>
            getTokenPricesByContracts(
              "solana",
              mints.filter((mint) => mint !== "native-sol"),
            ),
          ),
          requiresNativeSolPrice
            ? timeVendor("coingecko_sol_price", () => getCoinPricesByIds(["solana"]))
            : Promise.resolve(
                {} as Record<string, { usd?: number; usd_24h_change?: number }>,
              ),
        ]);
        tokens.forEach((t) => {
          if (t.isNative === true) {
            const price = nativeSolPrice.solana?.usd ?? null;
            const change24h = nativeSolPrice.solana?.usd_24h_change ?? null;
            t.priceUsd = price;
            t.priceChange24h =
              typeof change24h === "number" && Number.isFinite(change24h) ? change24h : null;
            t.valueUsd = price != null ? price * (Number(t.amount) || 0) : null;
            return;
          }

          const key = ((t.mint as string) ?? "").toLowerCase();
          const price = prices[key]?.usd ?? null;
          const change24h = prices[key]?.usd_24h_change ?? null;
          t.priceUsd = price;
          t.priceChange24h = typeof change24h === "number" && Number.isFinite(change24h) ? change24h : null;
          t.valueUsd = price != null ? price * (Number(t.amount) || 0) : null;
        });
      } catch {
        // Ignore pricing failures
      }
    }
  }

  const nftsAll: Record<string, UntypedJson>[] = includeNfts
    ? (Array.isArray(assets) ? assets : []).map((item) =>
        item && typeof item === "object" ? (item as Record<string, UntypedJson>) : ({} as Record<string, UntypedJson>)
      )
    : [];
  const nfts = nftsAll.slice(nftsCursor, nftsCursor + limit);
  const nextNftsCursor = nftsCursor + limit < nftsAll.length ? nftsCursor + limit : null;

  // Fetch transactions
  let txs: Record<string, UntypedJson>[] = [];
  if (includeTransactions) {
    const sigsResult = await withTimeout(
      timeVendor("helius_get_signatures_for_address", () =>
        defaultHeliusClient.invokeRaw("helius_get_signatures_for_address", { address: owner, limit: transactionLimit })
      ),
      fetchTimeoutMs,
      null
    );

    const sigsRecord = (sigsResult && typeof sigsResult === "object" ? sigsResult : {}) as Record<string, UntypedJson>;
    const toolResult = (sigsRecord.toolResult && typeof sigsRecord.toolResult === "object" ? sigsRecord.toolResult : {}) as Record<string, UntypedJson>;
    const list = Array.isArray(toolResult.result) ? toolResult.result : [];

    txs = list.slice(0, transactionLimit).map((entry) => {
      const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, UntypedJson>;
      return {
        signature: (typeof e.signature === "string" ? e.signature : typeof e.sig === "string" ? e.sig : null),
        timestamp: e.blockTime ? Number(e.blockTime) * 1000 : null,
      };
    });

    if (txs.length === 0) {
      txs = (await fetchSolanaRecentSignaturesFromRpc(owner, transactionLimit)).map((entry) => ({
        signature: entry.signature,
        timestamp: entry.timestamp,
      }));
    }
  }

  const summary: SolSummary = { tokens, nfts, txs, nextTokensCursor, nextNftsCursor };

  // Cache result
  if (isRedisConfigured) {
    redis.set(cacheKey, summary, { ex: SOLANA_CACHE_TTL_SECONDS }).catch(() => {});
  }

  return summary;
}
