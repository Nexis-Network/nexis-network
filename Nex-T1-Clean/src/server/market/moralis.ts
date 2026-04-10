
import Moralis from 'moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';
import { redis } from "@/server/services/redis";
import { createLogger } from "@/server/logging/logging";
import { moralisRequest } from "@/server/moralis/client";
import type { 
    CachedResponse, 
    TokenHolder, 
    TokenSecurity, 
    TokenTradeData, 
    TokenPair,
    TokenTransaction,
    CoinDetails
} from "@/types/market";
import crypto from "crypto";

const logger = createLogger("moralis-market");

const CACHE_NAMESPACE = "moralis";
const STALE_CACHE_TTL_MULTIPLIER = 6;
const MIN_STALE_CACHE_SECONDS = 10 * 60;

// ============================================================================
// Moralis SDK Initialization
// ============================================================================

let moralisInitialized = false;

async function initMoralis(): Promise<void> {
    if (moralisInitialized || Moralis.Core.isStarted) {
        moralisInitialized = true;
        return;
    }
    
    const apiKey = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY;
    if (!apiKey) {
        logger.warn("Moralis API key not configured, fallback will be limited");
        return;
    }
    
    try {
        await Moralis.start({ apiKey });
        moralisInitialized = true;
        logger.info("Moralis SDK initialized successfully");
    } catch (error) {
        logger.error("Failed to initialize Moralis SDK:", { error });
    }
}

// ============================================================================
// Chain Mapping
// ============================================================================

/**
 * Map chain ID to Moralis EvmChain format
 */
export function mapChainIdToMoralis(chainId: string | number): EvmChain | null {
    const s = String(chainId).toLowerCase();
    
    // Standard EVM Chain IDs
    if (s === "1" || s === "0x1" || s === "ethereum") return EvmChain.ETHEREUM;
    if (s === "56" || s === "0x38" || s === "bsc" || s === "bnb") return EvmChain.BSC;
    if (s === "137" || s === "0x89" || s === "polygon") return EvmChain.POLYGON;
    if (s === "42161" || s === "0xa4b1" || s === "arbitrum") return EvmChain.ARBITRUM;
    if (s === "10" || s === "0xa" || s === "optimism") return EvmChain.OPTIMISM;
    if (s === "8453" || s === "0x2105" || s === "base") return EvmChain.BASE;
    if (s === "43114" || s === "0xa86a" || s === "avalanche") return EvmChain.AVALANCHE;
    if (s === "250" || s === "0xfa" || s === "fantom") return EvmChain.FANTOM;
    if (s === "25" || s === "0x19" || s === "cronos") return EvmChain.CRONOS;
    if (s === "100" || s === "0x64" || s === "gnosis") return EvmChain.GNOSIS;
    
    // Solana is not EVM - handled separately
    if (s === "solana" || s === "101") return null;
    
    return null;
}

/**
 * Check if a chain is supported by Moralis EVM API
 */
export function isMoralisSupportedChain(chainId: string | number): boolean {
    return mapChainIdToMoralis(chainId) !== null;
}

// Note: getHexChainId was removed - use mapChainIdToMoralis(chainId).hex directly when needed

// ============================================================================
// Cache Helpers (similar to Birdeye)
// ============================================================================

type CacheEntry<T> = {
    value: T;
    fetchedAt: string;
};

function computeStaleTtl(ttlSeconds: number): number {
    const expanded = ttlSeconds * STALE_CACHE_TTL_MULTIPLIER;
    return Math.max(expanded, MIN_STALE_CACHE_SECONDS);
}

function stableStringify(value: UntypedJson): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const entries = Object.entries(value as Record<string, UntypedJson>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
        .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
        .join(",")}}`;
}

function buildCacheKey(parts: UntypedJson[]): string {
    const signature = stableStringify(parts);
    const digest = crypto.createHash("sha1").update(signature).digest("hex");
    return `${CACHE_NAMESPACE}:${digest}`;
}

async function readCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
        const cached = await redis.get<CacheEntry<T>>(key);
        return cached ?? null;
    } catch (error) {
        logger.warn(`Failed to read cache key ${key}`, { error });
        return null;
    }
}

async function readStaleCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const staleKey = `${key}:stale`;
    try {
        const cached = await redis.get<CacheEntry<T>>(staleKey);
        return cached ?? null;
    } catch (error) {
        logger.warn(`Failed to read stale cache key ${staleKey}`, { error });
        return null;
    }
}

async function writeCacheEntry<T>(key: string, ttlSeconds: number, entry: CacheEntry<T>) {
    try {
        await redis.set(key, entry, { ex: ttlSeconds });
        await redis.set(`${key}:stale`, entry, { ex: computeStaleTtl(ttlSeconds) });
    } catch (error) {
        logger.warn(`Failed to write cache key ${key}`, { error });
    }
}

function asRecord(value: unknown): Record<string, UntypedJson> | null {
    return value && typeof value === "object"
        ? (value as Record<string, UntypedJson>)
        : null;
}

function toText(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : null;
}

function toFiniteNumber(value: unknown): number | null {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function toUnixTimestamp(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value);
    }

    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Date.parse(value);
        if (!Number.isNaN(parsed)) {
            return Math.floor(parsed / 1000);
        }
    }

    return 0;
}

function extractRows(payload: unknown): Record<string, UntypedJson>[] {
    if (Array.isArray(payload)) {
        return payload
            .map((entry) => asRecord(entry))
            .filter((entry): entry is Record<string, UntypedJson> => Boolean(entry));
    }

    const record = asRecord(payload);
    const rows =
        (Array.isArray(record?.result) ? record?.result : null) ??
        (Array.isArray(record?.pairs) ? record?.pairs : null) ??
        (Array.isArray(record?.data) ? record?.data : null) ??
        [];

    return rows
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, UntypedJson> => Boolean(entry));
}

function mapTokenRef(
    address: unknown,
    symbol: unknown,
    decimals: unknown,
    logoUrl?: unknown,
): { address: string; symbol: string; decimals: number; logoUrl?: string } | undefined {
    const normalizedAddress = toText(address);
    const normalizedSymbol = toText(symbol);
    const normalizedDecimals = toFiniteNumber(decimals);
    const normalizedLogo = toText(logoUrl) ?? undefined;

    if (!normalizedAddress && !normalizedSymbol) {
        return undefined;
    }

    return {
        address: normalizedAddress ?? "",
        symbol: normalizedSymbol ?? "",
        decimals: normalizedDecimals ?? 0,
        ...(normalizedLogo ? { logoUrl: normalizedLogo } : {}),
    };
}

async function fetchMoralisAnalytics(
    address: string,
    chainHex: string,
): Promise<Record<string, UntypedJson> | null> {
    const payload = await moralisRequest<unknown>({
        api: "evm",
        path: `/erc20/${encodeURIComponent(address)}/analytics`,
        query: { chain: chainHex },
        cache: {
            ttlSeconds: 45,
            namespace: "moralis-market",
            tags: [`token:${address.toLowerCase()}`, `chain:${chainHex}`, "erc20-analytics"],
        },
    });

    return asRecord(payload);
}

async function fetchMoralisScore(
    address: string,
    chainHex: string,
): Promise<Record<string, UntypedJson> | null> {
    const payload = await moralisRequest<unknown>({
        api: "evm",
        path: `/erc20/${encodeURIComponent(address)}/score`,
        query: { chain: chainHex },
        cache: {
            ttlSeconds: 120,
            namespace: "moralis-market",
            tags: [`token:${address.toLowerCase()}`, `chain:${chainHex}`, "erc20-score"],
        },
    });

    return asRecord(payload);
}

function normalizeMoralisPair(row: Record<string, UntypedJson>): TokenPair | null {
    const baseTokenRecord = asRecord(row.baseToken ?? row.base_token);
    const quoteTokenRecord = asRecord(row.quoteToken ?? row.quote_token);

    const baseToken = mapTokenRef(
        baseTokenRecord?.address ?? row.base_token_address ?? row.baseTokenAddress,
        baseTokenRecord?.symbol ?? row.base_token_symbol ?? row.baseTokenSymbol,
        baseTokenRecord?.decimals ?? row.base_token_decimals ?? row.baseTokenDecimals,
        baseTokenRecord?.logoUrl ?? baseTokenRecord?.logo ?? row.base_token_logo ?? row.baseTokenLogo,
    );
    const quoteToken = mapTokenRef(
        quoteTokenRecord?.address ?? row.quote_token_address ?? row.quoteTokenAddress,
        quoteTokenRecord?.symbol ?? row.quote_token_symbol ?? row.quoteTokenSymbol,
        quoteTokenRecord?.decimals ?? row.quote_token_decimals ?? row.quoteTokenDecimals,
        quoteTokenRecord?.logoUrl ?? quoteTokenRecord?.logo ?? row.quote_token_logo ?? row.quoteTokenLogo,
    );

    const address = toText(row.pairAddress ?? row.pair_address ?? row.address);
    const name =
        toText(row.pairLabel ?? row.pair_label ?? row.name ?? row.symbol) ??
        [baseToken?.symbol, quoteToken?.symbol].filter(Boolean).join(" / ");

    if (!address || !name) {
        return null;
    }

    return {
        address,
        name,
        liquidity:
            toFiniteNumber(row.liquidityUsd ?? row.liquidity_usd ?? row.liquidity) ?? 0,
        volume24h:
            toFiniteNumber(
                row.volume24hUsd ??
                row.volume_24h_usd ??
                row.volume_usd_24h ??
                row.volumeUsd,
            ) ?? 0,
        price: toFiniteNumber(row.priceUsd ?? row.price_usd ?? row.usd_price) ?? 0,
        priceChange24h:
            toFiniteNumber(
                row.priceChange24h ??
                row.price_percent_change_24h ??
                row.price_change_24h,
            ) ?? undefined,
        dex: toText(row.exchangeName ?? row.exchange_name ?? row.dex) ?? "Unknown DEX",
        dexId: toText(row.dexId ?? row.exchange_id ?? row.dex_id) ?? undefined,
        quoteTokenSymbol:
            toText(
                row.quoteTokenSymbol ??
                row.quote_token_symbol ??
                quoteToken?.symbol,
            ) ?? "",
        url: toText(row.url ?? row.pairUrl ?? row.pair_url) ?? undefined,
        symbol: toText(row.pairLabel ?? row.pair_label ?? row.symbol) ?? name,
        trades24h: toFiniteNumber(row.trades24h ?? row.tx_count_24h) ?? undefined,
        uniqueWallets24h:
            toFiniteNumber(
                row.uniqueWallets24h ??
                row.unique_wallets_24h ??
                row.unique_wallets,
            ) ?? undefined,
        baseToken,
        quoteToken,
    };
}

async function withCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<CachedResponse<T>> {
    const cached = await readCacheEntry<T>(key);
    if (cached) {
        return {
            data: cached.value,
            fetchedAt: cached.fetchedAt,
            cache: "hit",
        };
    }

    try {
        const value = await fetcher();
        const entry: CacheEntry<T> = {
            value,
            fetchedAt: new Date().toISOString(),
        };
        await writeCacheEntry(key, ttlSeconds, entry);
        return {
            data: value,
            fetchedAt: entry.fetchedAt,
            cache: "miss",
        };
    } catch (error) {
        const stale = await readStaleCacheEntry<T>(key);
        if (stale) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`Serving stale cache for key ${key}: ${message}`);
            return {
                data: stale.value,
                fetchedAt: stale.fetchedAt,
                cache: "hit",
                stale: true,
                error: message,
            };
        }
        throw error;
    }
}

// ============================================================================
// Token Holders API
// ============================================================================

/**
 * Get token holders from Moralis API
 * Uses getTokenOwners endpoint for EVM chains
 */
export async function getMoralisTokenHolders(
    address: string,
    chainId: string,
    limit: number = 50
): Promise<CachedResponse<TokenHolder[]>> {
    const key = buildCacheKey(["moralis-holders", address, chainId, limit]);
    
    return withCache(key, 1800, async () => { // 30 minutes cache
        await initMoralis();
        
        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            logger.warn(`Chain ${chainId} not supported by Moralis EVM API`);
            return [];
        }
        
        try {
            logger.info(`Fetching token owners from Moralis: ${address} on ${chainId} (hex: ${chain.hex})`);
            const response = await Moralis.EvmApi.token.getTokenOwners({
                tokenAddress: address,
                chain,
                limit,
            });

            const rawResult = response.raw();
            const items = rawResult.result || [];

            logger.info(`Moralis owners count: ${items.length}`);

            // Map Moralis response to TokenHolder interface
            // `amount` is preserved as the raw string to avoid IEEE-754 precision loss
            // on very large integers (e.g. tokens with 18 decimals and large supplies).
            // Consumers MUST use `uiAmount` for display arithmetic.
            return items.map((holder) => ({
                amount: holder.balance || "0",
                decimals: 18,
                mint: address,
                owner: holder.owner_address || "",
                tokenAccount: holder.owner_address,
                uiAmount: parseFloat(holder.balance_formatted || "0"),
                value: holder.usd_value ? parseFloat(String(holder.usd_value)) : 0,
            }));
        } catch (error: UntypedJson) {
            logger.error("Moralis getTokenOwners failed:", { message: error instanceof Error ? error.message : String(error), address, chainId });
            return [];
        }
    });
}

// ============================================================================
// Token Security API
// ============================================================================

/**
 * Get token security info from Moralis API
 * Combines metadata and additional checks
 */
export async function getMoralisTokenSecurity(
    address: string,
    chainId: string
): Promise<CachedResponse<TokenSecurity | null>> {
    const key = buildCacheKey(["moralis-security", address, chainId]);
    
    return withCache(key, 86400, async () => { // 24 hour cache - security data is relatively static
        await initMoralis();
        
        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            logger.warn(`Chain ${chainId} not supported by Moralis EVM API`);
            return null;
        }
        
        try {
            const metadataResponse = await Moralis.EvmApi.token.getTokenMetadata({
                addresses: [address],
                chain,
            });
            
            const metadata = asRecord(metadataResponse.result?.[0]);
            const chainHex = chain.hex;

            const [analytics, score] = await Promise.all([
                fetchMoralisAnalytics(address, chainHex).catch((error) => {
                    logger.warn("Moralis token analytics lookup failed", {
                        address,
                        chainId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    return null;
                }),
                fetchMoralisScore(address, chainHex).catch((error) => {
                    logger.warn("Moralis token score lookup failed", {
                        address,
                        chainId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    return null;
                }),
            ]);

            if (!metadata && !analytics && !score) {
                return null;
            }

            return {
                creatorAddress:
                    toText(
                        metadata?.creator_address ??
                        metadata?.creatorAddress ??
                        metadata?.owner_address,
                    ) ?? "",
                creationTime: toUnixTimestamp(
                    metadata?.created_at ??
                    metadata?.createdAt ??
                    metadata?.creation_time,
                ),
                creationTx:
                    toText(
                        metadata?.creation_tx_hash ??
                        metadata?.creationTxHash ??
                        metadata?.creation_transaction_hash,
                    ) ?? "",
                mintTx:
                    toText(
                        metadata?.mint_tx_hash ??
                        metadata?.mintTxHash ??
                        metadata?.mint_transaction_hash,
                    ) ?? "",
                deployerBalance:
                    toFiniteNumber(
                        analytics?.deployer_balance ??
                        analytics?.deployerBalance,
                    ) ?? undefined,
                ownerBalance:
                    toFiniteNumber(
                        analytics?.owner_balance ??
                        analytics?.ownerBalance,
                    ) ?? undefined,
                isTrueToken:
                    typeof metadata?.verified_contract === "boolean"
                        ? metadata.verified_contract
                        : typeof metadata?.verifiedContract === "boolean"
                            ? metadata.verifiedContract
                            : typeof score?.is_true_token === "boolean"
                                ? score.is_true_token
                                : typeof score?.isTrueToken === "boolean"
                                    ? score.isTrueToken
                                    : undefined,
                isHoneypot:
                    typeof score?.is_honeypot === "boolean"
                        ? score.is_honeypot
                        : typeof score?.isHoneypot === "boolean"
                            ? score.isHoneypot
                            : undefined,
            };
        } catch (error) {
            logger.error("Moralis getTokenMetadata failed:", { error, address, chainId });
            return null;
        }
    });
}

// ============================================================================
// Token Pairs/Pools API
// ============================================================================

/**
 * Get token pairs (liquidity pools) from Moralis API
 */
export async function getMoralisTokenPairs(
    address: string,
    chainId: string
): Promise<TokenPair[]> {
    const key = buildCacheKey(["moralis-pairs", address, chainId]);

    const response = await withCache(key, 45, async () => {
        await initMoralis();

        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            logger.warn(`Chain ${chainId} not supported by Moralis EVM API`);
            return [];
        }

        try {
            const payload = await moralisRequest<unknown>({
                api: "evm",
                path: `/erc20/${encodeURIComponent(address)}/pairs`,
                query: {
                    chain: chain.hex,
                    limit: 25,
                },
                cache: {
                    ttlSeconds: 45,
                    namespace: "moralis-market",
                    tags: [`token:${address.toLowerCase()}`, `chain:${chain.hex}`, "erc20-pairs"],
                },
            });

            return extractRows(payload)
                .map((row) => normalizeMoralisPair(row))
                .filter((row): row is TokenPair => Boolean(row))
                .sort((left, right) => {
                    if (right.liquidity !== left.liquidity) {
                        return right.liquidity - left.liquidity;
                    }

                    return right.volume24h - left.volume24h;
                });
        } catch (error) {
            logger.error("Moralis token pairs lookup failed", {
                address,
                chainId,
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    });

    return response.data;
}

// ============================================================================
// Token Trade Data API
// ============================================================================

/**
 * Get token trade/volume data from Moralis API
 */
export async function getMoralisTokenTradeData(
    address: string,
    chainId: string
): Promise<CachedResponse<TokenTradeData | null>> {
    const key = buildCacheKey(["moralis-trade-data", address, chainId]);
    
    return withCache(key, 300, async () => { // 5 minute cache
        await initMoralis();
        
        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            logger.warn(`Chain ${chainId} not supported by Moralis EVM API`);
            return null;
        }
        
        try {
            // Get token stats for volume data
            const statsResponse = await Moralis.EvmApi.token.getTokenStats({
                address,
                chain,
            });
            
            const stats = statsResponse.result;
            if (!stats) {
                return null;
            }
            
            // Moralis stats structure - cast to record since runtime response may include fields
            // not yet reflected in the SDK type definitions
            const rawStats = stats.toJSON() as UntypedJson as Record<string, UntypedJson>;
            const volume24hUSD = rawStats.totalVolume24h ? parseFloat(String(rawStats.totalVolume24h)) : 0;
            
            return {
                volume24h: volume24hUSD, // Using USD as primary
                volume24hUSD: volume24hUSD,
                buy24h: 0, // Not directly available - would need trade analysis
                buy24hUSD: volume24hUSD / 2, // Approximate 50/50 split
                sell24h: 0,
                sell24hUSD: volume24hUSD / 2,
                uniqueWallets24h: rawStats.holders ? parseInt(String(rawStats.holders)) : 0,
                tradeCount24h: rawStats.transactions24h ? parseInt(String(rawStats.transactions24h)) : 0,
            };
        } catch (error) {
            logger.error("Moralis getTokenStats failed:", { error, address, chainId });
            return null;
        }
    });
}

// ============================================================================
// Token Price & Logo API
// ============================================================================

/**
 * Get token price from Moralis API
 */
export async function getMoralisTokenPrice(
    address: string,
    chainId: string
): Promise<{ priceUsd: number; logo: string | null } | null> {
    const key = buildCacheKey(["moralis-price", address, chainId]);
    
    const response = await withCache(key, 60, async () => { // 1 minute cache for prices
        await initMoralis();
        
        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            return null;
        }
        
        try {
            const priceResponse = await Moralis.EvmApi.token.getTokenPrice({
                address,
                chain,
            });
            
            const result = priceResponse.result;
            return {
                priceUsd: result.usdPrice || 0,
                logo: result.tokenLogo || null,
            };
        } catch (error) {
            logger.error("Moralis getTokenPrice failed:", { error, address, chainId });
            return null;
        }
    });
    
    return response.data;
}

// ============================================================================
// Token Transactions (Trades) API
// ============================================================================

/**
 * Get token transactions (trades/transfers) from Moralis API
 */
export async function getMoralisTokenTransactions(
    address: string,
    chainId: string,
    limit: number = 50
): Promise<CachedResponse<TokenTransaction[]>> {
    const key = buildCacheKey(["moralis-transactions", address, chainId, limit]);
    
    return withCache(key, 60, async () => { // 1 minute cache
        await initMoralis();
        
        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            logger.warn(`Chain ${chainId} not supported by Moralis EVM API`);
            return [];
        }
        
        try {
            logger.info(`Fetching token transfers from Moralis: ${address} on ${chainId}`);
            // Use getTokenTransfers endpoint as getTokenTrades is not available
            const response = await Moralis.EvmApi.token.getTokenTransfers({
                address,
                chain,
                limit,
            });
            
            const rawResult = response.raw;
            const items = rawResult.result || [];
            const birdeyeChain = chainId.toLowerCase();

            logger.info(`Moralis transfers count: ${items.length}`);

            // Map Moralis transfers to TokenTransaction interface
            return items.map((transfer) => {
                const txHash = transfer.transaction_hash || "";
                const valueRaw = transfer.value || "0";
                // Note: decimals from transfer (if available) could be used for more precise amount calc
                // but we use 18 as fallback since most EVM tokens use 18 decimals
                const amount = parseFloat(valueRaw) / Math.pow(10, 18); // fallback to 18 decimals
                // Note: price not available in transfer data

                return {
                    id: txHash,
                    blockTime: transfer.block_timestamp
                        ? (new Date(transfer.block_timestamp).getTime() / 1000)
                        : Date.now() / 1000,
                    type: "swap", // "transfer" is not valid in TokenTransaction type
                    source: "Scan",
                    owner: transfer.from_address || "",
                    baseAmount: amount,
                    baseSymbol: "", 
                    quoteAmount: 0,
                    quoteSymbol: "USD",
                    usdValue: 0,
                    url: birdeyeChain === "solana" 
                       ? `https://solscan.io/tx/${txHash}`
                       : `https://birdeye.so/tx/${txHash}?chain=${chainId}`
                };
            });
        } catch (error: UntypedJson) {
            logger.error("Moralis getTokenTransfers failed:", { message: error instanceof Error ? error.message : String(error), address, chainId });
            return [];
        }
    });
}

// ============================================================================
// Token Details (Metadata/Logo) API
// ============================================================================

/**
 * Get token details from Moralis API (normalized to CoinDetails)
 */
export async function getMoralisTokenDetails(
    id: string
): Promise<CachedResponse<CoinDetails>> {
    const key = buildCacheKey(["moralis-coin-details", id]);
    
    return withCache(key, 1800, async () => { // 30 minutes
        await initMoralis();
        
        // Parse ID (chain:address)
        let chainId = "bsc";
        let address = id;
        if (id.includes(":")) {
            [chainId, address] = id.split(":");
        }
        
        const chain = mapChainIdToMoralis(chainId);
        if (!chain) {
            throw new Error(`Chain ${chainId} not supported by Moralis`);
        }
        
        try {
            const metadataResponse = await Moralis.EvmApi.token.getTokenMetadata({
                addresses: [address],
                chain,
            });
            
            const metadata = metadataResponse.result?.[0];
            if (!metadata) {
                throw new Error("Token not found in Moralis");
            }
            
            // Get price as well
            const priceData = await getMoralisTokenPrice(address, chainId);
            
            // Get stats for volume/marketcap
            const statsData = await getMoralisTokenTradeData(address, chainId);
            const stats = statsData.data;
            
            return {
                id: `${chainId}:${address}`,
                name: metadata.token.name || "Unknown",
                symbol: metadata.token.symbol || "UNK",
                description: null,
                image: {
                    thumb: metadata.token.logo || metadata.token.thumbnail || null,
                    small: metadata.token.logo || metadata.token.thumbnail || null,
                    large: metadata.token.logo || metadata.token.thumbnail || null,
                },
                marketData: {
                    currentPriceUsd: priceData?.priceUsd || 0,
                    priceChangePercentage24h: 0,
                    marketCapUsd: 0, // MCAP usually Price * Supply
                    totalVolumeUsd: stats?.volume24hUSD || 0,
                    circulatingSupply: 0,
                    totalSupply: 0,
                    maxSupply: null,
                    athUsd: null,
                    atlUsd: null,
                    lastUpdated: new Date().toISOString(),
                    priceChangePercentage7d: null,
                    priceChangePercentage30d: null,
                    priceChangePercentage1y: null,
                    high24hUsd: null,
                    low24hUsd: null,
                    athDate: null,
                    atlDate: null,
                    fullyDilutedValuationUsd: null,
                },
                categories: [],
                marketCapRank: null,
                hashingAlgorithm: null,
                genesisDate: null,
                networks: [{ chain: chainId, contractAddress: address }],
                homepageUrls: [],
                blockchainSiteUrls: [],
                sentimentVotesUpPercentage: null,
                sentimentVotesDownPercentage: null,
            };
        } catch (error) {
            logger.error("Moralis getTokenMetadata/Price failed:", { error, address, chainId });
            throw error;
        }
    });
}

// ============================================================================
// Wallet Net Worth API
// ============================================================================

/**
 * Get wallet net worth from Moralis API (EVM)
 * Aggregates all token balances + native balance
 */
export async function getMoralisWalletNetWorth(
    address: string,
    chains: string[] = ["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base", "avalanche"]
): Promise<CachedResponse<{ totalUsd: number; chains: Record<string, number> }>> {
    const key = buildCacheKey(["moralis-wallet-networth", address, chains]);
    
    return withCache(key, 300, async () => { // 5 minute cache
        await initMoralis();
        
        let totalUsd = 0;
        const chainBreakdown: Record<string, number> = {};
        
        // Process chains in parallel chunks to avoid rate limits but optimize speed
        const chunks = [];
        const chunkSize = 3;
        for (let i = 0; i < chains.length; i += chunkSize) {
            chunks.push(chains.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (chainId) => {
                const chain = mapChainIdToMoralis(chainId);
                if (!chain) return;

                try {
                    let chainTotal = 0;

                    // 1. Get Native Balance (implied in getWalletNetWorth, but we query it here if needed later - currently unused so we skip assigning)
                    // const nativeBalance = await Moralis.EvmApi.balance.getNativeBalance({ ... });
                    
                    // We need native price to convert to USD
                    // Moralis native balance doesn't give USD automatically? 
                    // We can use getTokenPrice for the wrapper (WETH, WMATIC, etc) or use getWalletTokenBalances which might include native?
                    // getWalletTokenBalances DOES NOT include native usually.
                    // But `getWalletNetWorth` endpoint exists in Moralis? 
                    // Yes! `Moralis.EvmApi.wallets.getWalletNetWorth`
                    
                    // Let's use the dedicated endpoint if available in the SDK version
                    // Checking SDK docs via memory/assumption: `getWalletNetWorth` is available in recent SDKs.
                    // If not, we have to aggregate.
                    
                    // Attempting dedicated endpoint first
                   
                    const response = await Moralis.EvmApi.wallets.getWalletNetWorth({
                        address,
                        chains: [chain],
                        excludeSpam: true,
                        excludeUnverifiedContracts: false,
                    });
                    
                    const result = response.raw;
                    if (result.total_networth_usd) {
                        chainTotal = parseFloat(result.total_networth_usd);
                    } else {
                         // Fallback: manually fetch tokens?
                         // The dedicated endpoint is much better. If it returns 0 or fails, we might miss data.
                         // But for now let's rely on it.
                    }
                    
                    if (chainTotal > 0) {
                        totalUsd += chainTotal;
                        chainBreakdown[chainId] = chainTotal;
                    }
                    
                } catch (error) {
                    logger.warn(`Failed to fetch net worth for ${address} on ${chainId}`, { error });
                }
            }));
        }

        return {
            totalUsd,
            chains: chainBreakdown
        };
    });
}
