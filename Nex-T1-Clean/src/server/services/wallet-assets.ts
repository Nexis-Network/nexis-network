import { createClient } from "@/server/services/supabase/server";
import { 
    getSolanaPortfolio, 
    getSolanaBalance, 
    mapSolanaPortfolioToUnifiedAssets 
} from "@/server/moralis/solana/wallet";
import type { UnifiedAsset } from "@/modules/wallets/profile";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { getEvmWalletTokenBalancesPrice, getEvmNativeBalance } from "@/server/moralis/evm/wallet";
import { getMoralisTokenPrice } from "@/server/market/moralis";
import { MoralisError } from "@/server/moralis/client";


import { logger } from '@/lib/logger';
export type WalletAssetsResult = {
  success: boolean;
  assets: UnifiedAsset[];
  error?: {
    type: string;
    message: string;
    isRecoverable: boolean;
  };
};

// Map of Chain ID -> Wrapped Native Token Address for price fetching
const WRAPPED_NATIVE_MAP: Record<number, string> = {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    8453: '0x4200000000000000000000000000000000000006', // WETH (Base)
    10: '0x4200000000000000000000000000000000000006', // WETH (Optimism)
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH (Arbitrum)
    137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC/POL
    56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    43114: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
};

/**
 * Service to orchestrate wallet asset fetching and persistence
 */
export class WalletAssetsService {

  /**
   * Refreshes assets for a given wallet address and chain.
   * Fetches from Moralis (Solana) or Moralis (EVM), updates DB, and returns UnifiedAssets.
   */
  static async syncAssets(
    userId: string | null,
    walletId: string, // UUID or internal ID
    address: string,
    chainId: number | string, // 101 or "solana" or 1
    persist = true
  ): Promise<WalletAssetsResult> {
    if (!address) {
      return { 
        success: false, 
        assets: [], 
        error: {
          type: 'validation',
          message: 'No wallet address provided',
          isRecoverable: false,
        }
      };
    }

    try {
      const isEVM = isNonZeroEVMAddress(address);
      let unified: UnifiedAsset[] = [];

      if (isEVM) {
        // Moralis for EVM - Fetch from multiple chains
        // Ethereum, Base, Arbitrum, Optimism, Polygon, BSC
        const supportedChains = [
            { id: 1, name: 'ethereum', symbol: 'ETH' },
            { id: 8453, name: 'base', symbol: 'ETH' },
            { id: 42161, name: 'arbitrum', symbol: 'ETH' },
            { id: 10, name: 'optimism', symbol: 'ETH' },
            { id: 137, name: 'polygon', symbol: 'POL' },
            { id: 56, name: 'bsc', symbol: 'BNB' },
            { id: 43114, name: 'avalanche', symbol: 'AVAX' }
        ];

        // Process chains in parallel with settlement
        const results = await Promise.allSettled(
            supportedChains.map(async (chain) => {
                 try {
                     // Fetch Tokens and Native Balance in parallel
                     const [evmTokens, nativeBalance] = await Promise.all([
                        getEvmWalletTokenBalancesPrice({ 
                            address, 
                            chain: chain.id 
                        }),
                        getEvmNativeBalance({
                            address,
                            chain: chain.id
                        }).catch(() => null)
                     ]);

                     const chainAssets: UnifiedAsset[] = [];

                     // 1. Process Native Balance
                     if (nativeBalance && Number(nativeBalance.balance) > 0) {
                         // Fetch price for native token if possible
                         let priceUsd = 0;
                         const wrappedAddr = WRAPPED_NATIVE_MAP[chain.id];
                         if (wrappedAddr) {
                             const priceData = await getMoralisTokenPrice(wrappedAddr, String(chain.id)).catch(() => null);
                             priceUsd = priceData?.priceUsd ?? 0;
                         }

                         const balance = Number(nativeBalance.balance_formatted);
                         const valueUsd = balance * priceUsd;

                         chainAssets.push({
                            id: `evm-${chain.id}-native`,
                            chainId: chain.id,
                            platform: "evm" as const,
                            contract: null, // Native
                            name: nativeBalance.symbol === 'ETH' ? 'Ethereum' : (nativeBalance.name || 'Native Token'),
                            symbol: nativeBalance.symbol || chain.symbol,
                            decimals: Number(nativeBalance.decimals),
                            balance: Number(nativeBalance.balance),
                            uiAmount: balance,
                            priceUsd: priceUsd,
                            valueUsd: valueUsd,
                            change24hPercent: null, // Could fetch if needed
                            logoURI: nativeBalance.logo || null,
                            isNative: true
                         });
                     }

                     // 2. Process Token Balances
                     chainAssets.push(...evmTokens.map(t => ({
                        id: `evm-${chain.id}-${t.token_address}`,
                        chainId: chain.id,
                        platform: "evm" as const,
                        contract: t.native_token ? null : t.token_address || null,
                        name: t.name || "Unknown",
                        symbol: t.symbol || "UNK",
                        decimals: Number(t.decimals),
                        balance: Number(t.balance),
                        uiAmount: Number(t.balance_formatted),
                        priceUsd: Number(t.usd_price),
                        valueUsd: Number(t.usd_value),
                        change24hPercent: Number(t.usd_price_24hr_percent_change),
                        logoURI: t.logo || t.thumbnail || null,
                        isNative: !!t.native_token
                     })));

                     return chainAssets;
                 } catch (error) {
                    // Swallow 404s for specific chains (wallet inactive on that chain)
                    if (error instanceof MoralisError && error.errorType === 'not_found') {
                        return [];
                    }
                    logger.warn(`[WalletAssetsService] Asset fetch failed for chain ${chain.name} (${chain.id}): ${error instanceof Error ? error.message : String(error)}`);
                    // Don't throw entire failure if one chain fails, just return empty for that chain?
                    // But we want to know if everything failed. 
                    // Promise.allSettled handles it.
                    return [];
                 }
            })
        );

        // Aggregate results
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                unified.push(...result.value);
            }
        });

        // Inject default tokens for EVM chains (Ethereum, Base)
        unified = await this.injectEvmDefaultTokens(unified);

      } else {
        // Moralis for Solana
        const [portfolio, nativeBalance] = await Promise.all([
             getSolanaPortfolio({ address, network: "mainnet" }),
             getSolanaBalance({ address, network: "mainnet" })
        ]);

        // Moralis wrapper returns UnifiedFungibleAsset (new type)
        // We need to map it to UnifiedAsset (profile type)
        const moralisAssets = mapSolanaPortfolioToUnifiedAssets(portfolio, { kind: "solana", network: "mainnet" });

        unified = moralisAssets.map(t => ({
             id: t.id,
             chainId: 101,
             platform: "solana",
             contract: t.kind === 'native' ? null : t.address,
             name: t.name,
             symbol: t.symbol,
             decimals: t.decimals,
             balance: Number(t.balance), // Raw balance as number (precision loss possible but UnifiedAsset uses number)
             uiAmount: t.balanceFormatted ? Number(t.balanceFormatted) : (Number(t.balance) / Math.pow(10, t.decimals ?? 0)),
             priceUsd: t.priceUsd,
             valueUsd: t.valueUsd,
             change24hPercent: t.change24hPercent,
             logoURI: t.logoUrl,
             isNative: t.kind === 'native'
        }));

        // Add Native SOL if not present (Moralis portfolio usually misses native SOL if wrapped is not involved)
        const hasNative = unified.some(u => u.isNative);
        
        if (!hasNative) {
            const solBalanceRaw = nativeBalance.balance as string | undefined;
            if (solBalanceRaw && Number(solBalanceRaw) > 0) {
                const solBalance = Number(solBalanceRaw) / 1e9;
                
                // Try to get price from WSOL in the list or default 0
                const wsol = unified.find(a => a.symbol === 'WSOL');
                const solPrice = wsol?.priceUsd ?? 0;

                unified.unshift({
                    id: `solana-native`,
                    chainId: 101,
                    platform: "solana",
                    contract: null,
                    name: "Solana",
                    symbol: "SOL",
                    decimals: 9,
                    balance: Number(solBalanceRaw),
                    uiAmount: solBalance,
                    priceUsd: solPrice,
                    valueUsd: solBalance * solPrice,
                    change24hPercent: null,
                    logoURI: "/icons/chain-icons/solana.svg",
                    isNative: true
                });
            }
        }
      }

      // 3. Persist to DB
      if (persist && userId && walletId && walletId !== 'guest') {
        await this.persistHoldings(walletId, unified);
      }

      return { success: true, assets: unified };
      
    } catch (error) {
      logger.error(`[WalletAssetsService] Failed to sync assets for ${address}:`, error);
      return {
        success: false,
        assets: [],
        error: {
          type: 'unknown',
          message: error instanceof Error ? error.message : 'Failed to fetch wallet assets',
          isRecoverable: true,
        },
      };
    }
  }

  /**
   * Inject default EVM tokens (ETH, WETH, USDC, USDT, BNB, POL, AVAX) for Ethereum and Base chains
   * when they're not already present in the wallet
   */
  private static async injectEvmDefaultTokens(existing: UnifiedAsset[]): Promise<UnifiedAsset[]> {
    // Define default tokens per chain based on user requirements
    const defaultTokenConfigs: Array<{
      chainId: number;
      chainName: string;
      tokens: Array<{ symbol: string; name: string; contractAddress: string | null; decimals: number; isNative?: boolean; logoUrl?: string }>;
    }> = [
      {
        chainId: 1,
        chainName: 'ethereum',
        tokens: [
          { symbol: 'ETH', name: 'Ethereum', contractAddress: null, decimals: 18, isNative: true, logoUrl: '/icons/chain-icons/eth.svg' },
          { symbol: 'WETH', name: 'Wrapped Ether', contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, logoUrl: '/icons/chain-icons/eth.svg' },
          { symbol: 'USDC', name: 'USD Coin', contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, logoUrl: '/icons/chain-icons/usdc.svg' },
          { symbol: 'USDT', name: 'Tether USD', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, logoUrl: '/icons/chain-icons/usdt.svg' },
        ],
      },
      {
        chainId: 8453,
        chainName: 'base',
        tokens: [
          { symbol: 'ETH', name: 'Ethereum', contractAddress: null, decimals: 18, isNative: true, logoUrl: '/icons/chain-icons/eth.svg' },
          { symbol: 'WETH', name: 'Wrapped Ether', contractAddress: '0x4200000000000000000000000000000000000006', decimals: 18, logoUrl: '/icons/chain-icons/eth.svg' },
          { symbol: 'USDC', name: 'USD Coin', contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, logoUrl: '/icons/chain-icons/usdc.svg' },
        ],
      },
      {
        chainId: 56,
        chainName: 'bsc',
        tokens: [
          { symbol: 'BNB', name: 'BNB', contractAddress: null, decimals: 18, isNative: true, logoUrl: '/icons/chain-icons/bnb.svg' },
        ],
      },
      {
        chainId: 137,
        chainName: 'polygon',
        tokens: [
          { symbol: 'POL', name: 'Polygon', contractAddress: null, decimals: 18, isNative: true, logoUrl: '/icons/chain-icons/polygon.svg' },
        ],
      },
      {
        chainId: 43114,
        chainName: 'avalanche',
        tokens: [
          { symbol: 'AVAX', name: 'Avalanche', contractAddress: null, decimals: 18, isNative: true, logoUrl: '/icons/chain-icons/avax.svg' },
        ],
      },
    ];

    // Build set of existing token keys for quick lookup
    const existingKeys = new Set(
      existing.map(t => {
        const addr = t.contract?.toLowerCase() ?? 'native';
        return `${t.chainId}-${addr}`;
      })
    );

    const missingDefaults: UnifiedAsset[] = [];

    // Check each chain's default tokens
    for (const chainConfig of defaultTokenConfigs) {
      for (const token of chainConfig.tokens) {
        const addr = token.contractAddress?.toLowerCase() ?? 'native';
        const key = `${chainConfig.chainId}-${addr}`;

        if (!existingKeys.has(key)) {
          // Create zero-balance entry for missing default token
          missingDefaults.push({
            id: `evm-${chainConfig.chainId}-${addr}`,
            chainId: chainConfig.chainId,
            platform: 'evm',
            contract: token.contractAddress,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            balance: 0,
            uiAmount: 0,
            priceUsd: null, // Will be fetched separately or left null
            valueUsd: 0,
            change24hPercent: null,
            logoURI: token.logoUrl ?? null,
            isNative: token.isNative ?? false,
          });
        }
      }
    }

    // Optionally fetch current prices for missing default tokens
    // For now, we skip price fetching to avoid extra API calls - UI will show $0 value
    // Prices can be fetched lazily when user expands the token

    return [...existing, ...missingDefaults];
  }



  private static async persistHoldings(walletId: string, assets: UnifiedAsset[]) {
    const supabase = await createClient();
    if (!supabase) return;

    // Helper to map chainId to string for DB
    const getChainName = (asset: UnifiedAsset): string => {
        if (asset.platform === 'solana') return 'solana';
        switch (Number(asset.chainId)) {
            case 1: return 'ethereum';
            case 8453: return 'base';
            case 42161: return 'arbitrum';
            case 10: return 'optimism';
            case 137: return 'polygon';
            case 56: return 'bsc';
            default: return 'ethereum'; // Default to ethereum if unknown EVM
        }
    };

    const rows = assets.map(a => ({
      user_wallet_id: walletId,
      chain: getChainName(a),
      token_address: a.contract || 'native',
      name: a.name || 'Unknown',
      symbol: a.symbol || 'UNK',
      decimals: a.decimals || 0,
      ui_amount: a.uiAmount || 0,
      price_usd: a.priceUsd || 0,
      value_usd: a.valueUsd || 0,
      logo_url: a.logoURI
    }));

    if (rows.length === 0) return;

    // Transactional delete and insert would be ideal, but for now:
    await supabase.from("token_holdings").delete().eq("user_wallet_id", walletId);
    
    const { error } = await supabase.from("token_holdings").insert(rows);
    if (error) {
       logger.warn("[WalletAssetsService] Persist failed:", error);
    }
  }
}
