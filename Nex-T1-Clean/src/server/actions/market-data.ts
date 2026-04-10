'use server';

import { 
    getTrendingCollection,
    searchAssets,
    getCoinSnapshotsByIds,
    getTokenMarketChartByContract,
    getTokenDataByContract,
    getPoolsByToken,
    getPoolTrades
} from '@/server/market/coingecko';

import {
    getCryptorankCurrencyId,
    getAssetVestingData,
    getAssetVestingChart,
    getAssetFundingRounds,
    getAssetPublicSales
} from "@/server/cryptorank/assets";

import {
    getMoralisTokenHolders,
    getMoralisTokenSecurity,
    getMoralisTokenTradeData,
    getMoralisTokenTransactions,
    getMoralisTokenPairs,
    isMoralisSupportedChain
} from '@/server/market/moralis';

import { 
    TokenHolder, 
    TokenSecurity, 
    TokenTradeData, 
    TokenPair, 
    TokenTransaction,
    CoinMarketRow,
    OnchainPoolData
} from "@/types/market";

import { AssetTick } from "@/lib/utils/asset-normalization";


import { logger } from '@/lib/logger';
export type ChartTimeframe = "1H" | "1D" | "1W" | "1M" | "1Y" | "max";

type CrossChainSearchItem = {
  id: string;
  name: string;
  symbol: string;
  chainId?: string | number;
  chain?: string;
  logoURI?: string;
  thumb?: string;
};

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/u;

function resolveChainIdValue(value: UntypedJson): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function inferChainFromAddress(address: string) {
  if (EVM_ADDRESS_REGEX.test(address)) {
    return { chainType: "evm" as const, chainId: "1", coingeckoChain: "ethereum", decimals: 18 };
  }
  // Default to Solana if not EVM-like, though this is a loose assumption. 
  // Ideally we use a strict validator or passed-in chainId.
  return { chainType: "solana" as const, chainId: "solana", coingeckoChain: "solana", decimals: 9 };
}

// Map internal chainIds to CoinGecko's network IDs
function mapToCoingeckoPlatform(chainId: string | number): string {
    const id = String(chainId).toLowerCase();
    if (id === '1') return 'ethereum';
    if (id === '137') return 'polygon-pos';
    if (id === '42161') return 'arbitrum-one';
    if (id === '10') return 'optimism';
    if (id === '8453') return 'base';
    if (id === '56') return 'binance-smart-chain';
    if (id === '43114') return 'avalanche';
    if (id === 'solana' || id === '101') return 'solana';
    return 'ethereum'; // Default Fallback
}

export async function getTrendingTokens() {
  try {
    const result = await getTrendingCollection();
    // Return just the coins for now as per requirements
    // Taking top 10 as per prompt
    return result.data.coins.slice(0, 10);
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to fetch trending tokens',
    );
    return [];
  }
}

/**
 * Get token price history chart data
 */
export async function getTokenHistory(
    chainId: string,
    address: string,
    timeframe: ChartTimeframe,
    type: "price" | "volume" | "tvl" = "price",
    _interval: string = "hourly"
): Promise<[number, number][]> {
    const platform = mapToCoingeckoPlatform(chainId);
    let days: string | number = 7;
    
    // Map timeframe to days
    switch(timeframe) {
        case "1H": days = 1; break; // API min is 1 day for hourly
        case "1D": days = 1; break;
        case "1W": days = 7; break;
        case "1M": days = 30; break;
        case "1Y": days = 365; break;
        case "max": days = "max"; break;
    }

    try {
        // Use CoinGecko's contract endpoint
        const result = await getTokenMarketChartByContract({
            platform,
            contractAddress: address,
            vsCurrency: 'usd',
            days,
            // CoinGecko auto-granulates based on days, but we can hint
        });
        
        if (!result.data) return [];

        if (type === "volume") {
             return result.data.totalVolumes || [];
        } else {
             return result.data.prices || [];
        }
    } catch (error) {
        logger.error("getTokenHistory failed:", error);
        return [];
    }
}

/**
 * Get token holders (top holders)
 */
export async function getAssetHolders(
    chainId: string, 
    address: string
): Promise<TokenHolder[]> {
    try {
        if (isMoralisSupportedChain(chainId)) {
             return (await getMoralisTokenHolders(address, chainId, 50)).data;
        }
        
        // CoinGecko does not provide holder lists in the public Onchain API.
        // We return empty for Solana/others for now to remove BirdEye dependency.
        return [];
    } catch (error) {
        logger.error("getAssetHolders failed:", error);
        return [];
    }
}

/**
 * Get token security info
 */
export async function getAssetSecurity(
    chainId: string,
    address: string
): Promise<TokenSecurity | null> {
    try {
        if (isMoralisSupportedChain(chainId)) {
            return (await getMoralisTokenSecurity(address, chainId)).data;
        }

        // CoinGecko doesn't provide deep security audit data (mint authority, etc) via this API.
        return null; 
    } catch (error) {
         logger.error("getAssetSecurity failed:", error);
         return null;
    }
}

/**
 * Get token trade data (stats)
 */
export async function getAssetTradeData(
    chainId: string,
    address: string
): Promise<TokenTradeData | null> {
    try {
         if (isMoralisSupportedChain(chainId)) {
            return (await getMoralisTokenTradeData(address, chainId)).data;
        }

        const platform = mapToCoingeckoPlatform(chainId);
        const data = await getTokenDataByContract(platform, address);
        
        if (data.data && data.data.attributes) {
            const attr = data.data.attributes;
            return {
                address: attr.address,
                price: Number(attr.price_usd),
                volume24h: Number(attr.volume_usd?.h24 || 0),
                marketCap: Number(attr.market_cap_usd || 0),
                // Other fields generic or missing
                liquidity: Number(attr.total_reserve_in_usd || 0),
                raw: data.data
            } as unknown as TokenTradeData;
        }
        return null;

    } catch (error) {
        logger.error("getAssetTradeData failed:", error);
        return null;
    }
}

/**
 * Get token pairs (liquidity pools)
 */
export async function getAssetPairs(
    chainId: string,
    address: string
): Promise<TokenPair[]> {
    try {
        if (isMoralisSupportedChain(chainId)) {
            return await getMoralisTokenPairs(address, chainId);
        }

        const platform = mapToCoingeckoPlatform(chainId);
        const result = await getPoolsByToken(platform, address);
        
        if (result.data) {
            return result.data.map((pool: OnchainPoolData): TokenPair => {
                const attr = pool.attributes;
                return {
                    address: attr.address,
                    name: attr.name,
                    price: Number(attr.base_token_price_usd || 0),
                    liquidity: Number(attr.reserve_in_usd || 0),
                    volume24h: Number(attr.volume_usd?.h24 || 0),
                    dex: pool.relationships?.dex?.data?.id || "unknown",
                    quoteTokenSymbol: "QUOTE", // Simplified
                    symbol: attr.name,
                    baseToken: {
                         address: pool.relationships?.base_token?.data?.id || "",
                         symbol: "BASE", 
                         decimals: 18
                    },
                     quoteToken: {
                         address: pool.relationships?.quote_token?.data?.id || "",
                         symbol: "QUOTE",
                         decimals: 18
                    }
                };
            });
        }
        return [];
    } catch (error) {
        logger.error("getAssetPairs failed:", error);
        return [];
    }
}

/**
 * Get token transactions (activity)
 */
export async function getAssetTransactions(
    chainId: string,
    address: string,
    _page: number = 1,
    limit: number = 20
): Promise<TokenTransaction[]> {
    try {
        if (isMoralisSupportedChain(chainId)) {
             return (await getMoralisTokenTransactions(address, chainId, limit)).data;
        }

        // We use pool trades as a proxy for token transactions if we can find the top pool.
        // This is a heuristic.
        const platform = mapToCoingeckoPlatform(chainId);
        const pools = await getPoolsByToken(platform, address);
        if (pools.data && pools.data.length > 0) {
            const topPool = pools.data[0]; // Assuming sorted by liquidity/volume usually
            const trades = await getPoolTrades(platform, topPool.attributes.address);
            if (trades.data) {
                return trades.data.slice(0, limit).map((t): TokenTransaction => {
                    const attr = t.attributes;
                    return {
                        id: attr.tx_hash,
                        blockTime: new Date(attr.block_timestamp).getTime() / 1000,
                        type: attr.kind as TokenTransaction["type"], // "buy" | "sell" matches
                        source: "dex", 
                        owner: attr.tx_from_address,
                        baseAmount: Number(attr.from_token_amount),
                        baseSymbol: "BASE",
                        quoteAmount: Number(attr.to_token_amount),
                        quoteSymbol: "QUOTE",
                        usdValue: Number(attr.volume_in_usd),
                    };
                });
            }
        }
        return [];
    } catch (error) {
        logger.error("getAssetTransactions failed:", error);
        return [];
    }
}

/**
 * Find asset across supported chains by symbol.
 * This is a placeholder – real implementation would query cross-chain asset registries.
 */
export async function findAssetCrossChain(
    symbol: string
): Promise<AssetTick[]> {
    const normalized = symbol.trim();
    if (!normalized) return [];

    try {
        const search = await searchAssets(normalized);
        const rawCoins = Array.isArray(search.data?.coins) ? (search.data.coins as CrossChainSearchItem[]) : [];
        if (!rawCoins.length) return [];

        const chainGroups: Record<string, string[]> = {};
        const coinByAddress = new Map<string, CrossChainSearchItem>();

        for (const coin of rawCoins) {
            if (!coin?.id) continue;
            const inferred = inferChainFromAddress(coin.id);
            const resolvedChainId = resolveChainIdValue(coin.chainId);
            const chainKey = typeof coin.chain === "string" && coin.chain.trim()
              ? coin.chain.trim().toLowerCase()
              : inferred.coingeckoChain;

            if (!chainGroups[chainKey]) chainGroups[chainKey] = [];
            chainGroups[chainKey].push(coin.id);
            coinByAddress.set(coin.id, {
              ...coin,
              chainId: resolvedChainId ?? inferred.chainId,
            });
        }

        const snapshots = new Map<string, CoinMarketRow>();
        await Promise.all(
            Object.entries(chainGroups).map(async ([_chain, ids]) => {
                if (!ids.length) return;
                // CoinGecko getCoinSnapshotsByIds does not accept chain param, only IDs.
                // IDs are unique enough usually (coingecko coin ids).
                const rows = await getCoinSnapshotsByIds(ids, { vsCurrency: 'usd' });
                rows.forEach((row) => {
                    const key = row.address ?? row.id;
                    if (key) snapshots.set(key, row);
                });
            })
        );

        return rawCoins.map((coin) => {
            const snapshot = snapshots.get(coin.id);
            const inferred = inferChainFromAddress(coin.id);
            const resolvedChainId = resolveChainIdValue(coin.chainId) ?? inferred.chainId;
            return {
                symbol: coin.symbol,
                name: coin.name,
                price: typeof snapshot?.currentPrice === "number" ? snapshot.currentPrice : 0,
                change24h: typeof snapshot?.priceChangePercentage24h === "number" ? snapshot.priceChangePercentage24h : 0,
                volume24h: typeof snapshot?.totalVolume === "number" ? snapshot.totalVolume : undefined,
                marketCap: typeof snapshot?.marketCap === "number" ? snapshot.marketCap : undefined,
                chain: inferred.chainType,
                chainId: resolvedChainId,
                address: coin.id,
                decimals: inferred.decimals,
                logoUrl:
                  snapshot?.logoUrl ??
                  snapshot?.image ??
                  coin.logoURI ??
                  coin.thumb ??
                  undefined,
                description: undefined,
                websiteUrl: undefined,
                twitterUrl: undefined,
                telegramUrl: undefined,
                explorerUrl: undefined,
            };
        });
    } catch (error) {
        logger.error("findAssetCrossChain failed:", error);
        return [];
    }
}




/**
 * Get asset vesting data including chart
 */
export async function getAssetVesting(symbol: string) {
    try {
        const id = await getCryptorankCurrencyId(symbol);
        if (!id) return null;

        const [details, chart] = await Promise.all([
            getAssetVestingData(id),
            getAssetVestingChart(id)
        ]);

        return { details, chart };
    } catch (error) {
        logger.error(`getAssetVesting failed for ${symbol}:`, error);
        return null;
    }
}

/**
 * Get asset funding rounds
 */
export async function getAssetFunding(symbol: string) {
    try {
        const id = await getCryptorankCurrencyId(symbol);
        if (!id) return [];
        return await getAssetFundingRounds(id);
    } catch (error) {
        logger.error(`getAssetFunding failed for ${symbol}:`, error);
        return [];
    }
}

/**
 * Get asset public sales (ICO/IDO)
 */
export async function getAssetSales(symbol: string) {
    try {
        const id = await getCryptorankCurrencyId(symbol);
        if (!id) return [];
        return await getAssetPublicSales(id);
    } catch (error) {
        logger.error(`getAssetSales failed for ${symbol}:`, error);
        return [];
    }
}
