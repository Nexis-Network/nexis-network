import { notFound } from "next/navigation";
import { AssetClientView } from "@/components/assets/asset-client-view";
import { getChainAdapter } from "@/lib/chain-adapter/chain-adapter";
import { normalizeAsset } from "@/lib/utils/asset-normalization";
import { 
  getCoinDetails, 
  getCoinMarketChart, 
  getCoinIdByContract,
  searchAssets
} from "@/server/market/coingecko";
import type { Metadata } from "next";
import { logger } from '@/lib/logger';


interface Params {
  chainType: string;
  tokenAddress: string;
}

interface PageProps {
  params: Promise<Params>;
}

async function fetchAssetData(chainIdOrName: string, tokenAddress: string) {
  try {
    // 1. Resolve Platform ID for CoinGecko
    let platform = "ethereum";
    if (chainIdOrName === "solana" || chainIdOrName === "101") platform = "solana";
    else if (chainIdOrName === "1") platform = "ethereum";
    else if (chainIdOrName === "137") platform = "polygon-pos"; // CoinGecko uses polygon-pos
    else if (chainIdOrName === "42161") platform = "arbitrum-one";
    else if (chainIdOrName === "10") platform = "optimistic-ethereum";
    else if (chainIdOrName === "8453") platform = "base";
    else if (chainIdOrName === "56" || chainIdOrName === "bsc") platform = "binance-smart-chain";
    else if (chainIdOrName === "43114" || chainIdOrName === "avalanche") platform = "avalanche";
    else if (chainIdOrName === "324" || chainIdOrName === "zksync") platform = "zksync";
    else if (chainIdOrName === "sui") platform = "sui";
    
    // 2. Resolve Coin ID
    let coinId: string | null = null;

    if (tokenAddress === "native") {
         // Map native tokens manually
         switch(platform) {
             case "solana": coinId = "solana"; break;
             case "ethereum": coinId = "ethereum"; break;
             case "binance-smart-chain": coinId = "binancecoin"; break;
             case "avalanche": coinId = "avalanche-2"; break;
             case "sui": coinId = "sui"; break;
             case "polygon-pos": coinId = "matic-network"; break; // or polygon-ecosystem-token? keeping matic for now
             default: coinId = "ethereum";
         }
    } else {
        // Try getting by contract
        const contractData = await getCoinIdByContract(platform, tokenAddress);
        if (contractData.data) {
            coinId = contractData.data;
        } else {
            // Fallback: Search if contract lookup fails (rare but helps)
             const search = await searchAssets(tokenAddress);
             if (search.data && search.data.coins.length > 0) {
                 coinId = search.data.coins[0].id;
             }
        }

        // Final fallback: treat tokenAddress as a CoinGecko slug directly
        // (handles screener navigation where CoinGecko slugs like "bitcoin" are used as IDs)
        if (!coinId) {
            coinId = tokenAddress;
        }
    }

    if (!coinId) {
        logger.warn(`[AssetPage] Could not resolve CoinGecko ID for ${platform}:${tokenAddress}`);
        return null;
    }

    // 3. Fetch Details & History in parallel
    const [details, history] = await Promise.all([
      getCoinDetails(coinId),
      getCoinMarketChart(coinId, { vsCurrency: "usd", days: 7 }).catch(() => null)
    ]); 

    if (!details?.data) return null;

    // 4. Normalize
    const d = details.data;

    // Resolve the real contract address from CoinGecko's networks data.
    // When navigating via CoinGecko slug (e.g. "bitcoin"), tokenAddress is the slug
    // instead of a real blockchain address. Extract the contract address for the
    // target platform, or fall back to "native" for L1 tokens.
    let resolvedAddress = tokenAddress;
    let resolvedPlatform = platform;
    if (d.networks && d.networks.length > 0) {
      const match = d.networks.find(n => n.chain === platform && n.contractAddress);
      if (match?.contractAddress) {
        resolvedAddress = match.contractAddress;
      } else {
        // Try any network with a contract address (for cross-chain tokens)
        const anyMatch = d.networks.find(n => n.contractAddress);
        if (anyMatch?.contractAddress) {
          resolvedAddress = anyMatch.contractAddress;
          resolvedPlatform = anyMatch.chain;
        } else {
          resolvedAddress = "native";
        }
      }
    } else if (coinId === tokenAddress) {
      // CoinGecko slug with no networks = L1 native token (bitcoin, ethereum, solana)
      resolvedAddress = "native";
    }

    // Safety checks for market data (sometimes partial)
    const currentPrice = d.marketData.currentPriceUsd ?? 0;
    const priceChange24h = d.marketData.priceChangePercentage24h ?? 0;
    const volume24h = d.marketData.totalVolumeUsd ?? 0;
    const marketCap = d.marketData.marketCapUsd ?? 0;

    const chainType = resolvedPlatform === "solana" ? "solana" : resolvedPlatform === "sui" ? "sui" : "evm";
    const ticker = normalizeAsset({
      symbol: d.symbol.toUpperCase(),
      name: d.name,
      price: currentPrice,
      change24h: priceChange24h,
      volume24h: volume24h,
      marketCap: marketCap,

      chain: chainType,
      chainId: chainIdOrName,
      address: resolvedAddress,
      decimals: 18,
      logoUrl: d.image?.large || d.image?.small || d.image?.thumb || undefined,

      description: d.description || "",
      websiteUrl: d.homepageUrls[0] || undefined,
      twitterUrl: d.blockchainSiteUrls.find((url) => url.includes("twitter")) || undefined,
    }, chainType);

    return { asset: ticker, history: history?.data?.prices || [] };

  } catch (error) {
    logger.error("Failed to fetch asset data:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { chainType, tokenAddress } = resolvedParams;
  return {
    title: `Asset ${tokenAddress.slice(0, 6)}... on ${chainType} | Nexis Dashboard`,
  };
}

export default async function AssetPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { chainType, tokenAddress } = resolvedParams;

  const adapter = getChainAdapter(chainType);

  // "native" requires a known chain adapter
  if (tokenAddress === "native" && !adapter) {
    return notFound();
  }

  // Use the adapter's chain ID when available, otherwise pass chainType directly
  // (allows CoinGecko slug lookups when the address isn't a valid blockchain address)
  const chainId = adapter?.chainId ?? chainType;
  const data = await fetchAssetData(chainId, tokenAddress);

  if (!data) {
    return notFound();
  }

  return (
    <AssetClientView initialAsset={data.asset} initialHistory={data.history} />
  );
}
