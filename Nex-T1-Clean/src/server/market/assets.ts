import { getTopCoins } from "@/server/market/coingecko";
import { CoinMarketRow } from "@/types/market";
import { logger } from '@/lib/logger';

// Support standard EVM chains + Solana (Mapped to CoinGecko Categories where possible)
export const SUPPORTED_ASSET_CHAINS = [
    "solana",
    "ethereum",
    "base",
    "arbitrum",
    "optimism",
    "polygon",
    "avalanche",
    "bsc"
];

const CHAIN_TO_CATEGORY_MAP: Record<string, string> = {
    // These are simplified ecosystem categories. 
    // Note: CoinGecko categories change ID sometimes, ideally we fetch category list dynamically.
    // For now we use common ones.
    "solana": "solana-ecosystem",
    "ethereum": "ethereum-ecosystem",
    "base": "base-ecosystem",
    "arbitrum": "arbitrum-ecosystem",
    "optimism": "optimism-ecosystem",
    "polygon": "polygon-ecosystem",
    "avalanche": "avalanche-ecosystem",
    "bsc": "bnb-chain-ecosystem"
};

export type AssetFilter = {
    chain?: string;
    search?: string;
    category?: string;
    limit?: number;
    offset?: number;
    skipEnrich?: boolean;
};

/**
 * Aggregates market tokens from supported chains using CoinGecko.
 */
export async function getUnifiedMarketAssets(filter: AssetFilter = {}): Promise<CoinMarketRow[]> {
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    const page = Math.floor(offset / limit) + 1;
    
    let category: string | undefined = undefined;

    if (filter.chain && filter.chain !== "all") {
        if (filter.chain === "memes") {
            category = "meme-token";
        } else {
            category = CHAIN_TO_CATEGORY_MAP[filter.chain.toLowerCase()];
        }
    } else if (filter.category) {
        category = filter.category;
    }

    try {
        const response = await getTopCoins({
            vsCurrency: "usd",
            order: "market_cap_desc",
            perPage: limit,
            page: page,
            category: category,
            priceChangePercentage: "1h,24h,7d" // Ensures we get sparklines and changes
        });

        let assets = response.data || [];

        // Filter stables if requested (logic from previous implementation)
        // Note: The previous implementation filtered STABLES manually. 
        // We can keep that if desired, but effectively "Top Coins" naturally ranks them.
        // User request: "EXCLUDE STABLECOINS"
        const STABLES = ["USDC", "USDT", "DAI", "FDUSD", "USDE", "USDB", "PYUSD", "GUSD", "USDP", "TUSD", "FRAX", "LUSD", "EURC"];
        assets = assets.filter(a => !STABLES.includes(a.symbol.toUpperCase()));

        // Enrichment is mostly handled by CoinGecko (sparklines are included if sparkline=true in getTopCoins)
        // getTopCoins in coingecko.ts passes sparkline: "true"
        
        return assets;
    } catch (error) {
        logger.error("getUnifiedMarketAssets failed:", error);
        return [];
    }
}

