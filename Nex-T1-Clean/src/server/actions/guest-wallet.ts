"use server";

import { WalletAssetsService } from "@/server/services/wallet-assets";
import { getWalletNetWorth } from "@/server/market/birdeye";
import { WalletSnapshot } from "@/modules/wallets/profile";
import { isNonZeroEVMAddress } from "@/lib/utils/token-utils";
import { getEvmUnifiedPnL } from "@/server/moralis/evm/wallet";


import { logger } from '@/lib/logger';
// Local helper to avoid importing client components
function getChainIconUrl(chainId: number): string {
    if (chainId === 101) return "https://assets.coingecko.com/coins/images/4128/small/solana.png";
    if (chainId === 1) return "https://assets.coingecko.com/coins/images/279/small/ethereum.png";
    return ""; // Fallback
}

export type GuestWalletError = {
    error: string;
    type: string;
    isRecoverable: boolean;
};

export async function fetchGuestWalletSnapshot(
    address: string, 
    chainId: number
): Promise<WalletSnapshot | GuestWalletError | null> {
    if (!address) return null;

    try {
        const isEVM = isNonZeroEVMAddress(address);
        
        // 1. Fetch Assets (Tokens)
        const assetsResult = await WalletAssetsService.syncAssets(
            null, 
            "guest", 
            address, 
            chainId, 
            false
        );
        
        // Check for errors
        if (!assetsResult.success && assetsResult.error) {
            // Return error to UI instead of null
            return {
                error: assetsResult.error.message,
                type: assetsResult.error.type,
                isRecoverable: assetsResult.error.isRecoverable,
            };
        }
        
        const assets = assetsResult.assets;
        
        // 2. Fetch Net Worth & PnL
        let totalUsd = 0;
        let pnlUsd: number | null = null;
        let pnlPercent: number | null = null;

        if (isEVM) {
             // For EVM, fetch PnL summary from Moralis
             try {
                 const pnlData = await getEvmUnifiedPnL({ address, chain: chainId });
                 const assetSum = assets.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
                 totalUsd = assetSum; 
                 pnlUsd = pnlData.unrealizedUsd ?? null; 
                 pnlPercent = pnlData.roiPercent ?? null;
             } catch (error) {
                 logger.warn("Moralis PnL fetch failed", error);
                 // Fallback
                 totalUsd = assets.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
             }
        } else {
             // For Solana, use Birdeye V2
             try {
                const netWorth = await getWalletNetWorth(address, chainId);
                totalUsd = netWorth.totalUsd || assets.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
             } catch {
                totalUsd = assets.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
             }
        }
        
        // 3. Construct Snapshot
        const tokens = assets.map(a => ({
             ...a,
        }));

        return {
            id: `eoa-${address}`,
            address,
            provider: "external",
            label: "External Wallet",
            customLabel: null,
            type: isEVM ? "external_evm" : "external_solana",
            chains: [{
                name: chainId === 101 ? "Solana" : "Ethereum",
                icon: getChainIconUrl(chainId),
                type: "mainnet"
            }],
            tokens,
            nfts: [],
            totals: {
                tokenCount: tokens.length,
                nftCount: 0,
                estimatedValueUsd: totalUsd,
                nativeValueUsd: tokens.find(t => t.isNative)?.valueUsd ?? null,
                totalPnlUsd: pnlUsd,
                totalPnlPercent: pnlPercent
            },
            metadata: {
                chainId,
                connected: true,
                isGuest: true
            }
        };

    } catch (error) {
        logger.error("fetchGuestWalletSnapshot failed", error);
        return {
            error: error instanceof Error ? error.message : 'Failed to fetch wallet data',
            type: 'unknown',
            isRecoverable: true,
        };
    }
}
