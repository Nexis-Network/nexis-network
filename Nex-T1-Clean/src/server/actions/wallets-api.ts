"use server";

import { asRecord, toNumber } from "@/server/moralis/utils";
import {
  getEvmDefiPositionsSummary,
  getEvmNativeBalance,
  getEvmWalletHistory,
  getEvmWalletTokenApprovals,
  getEvmWalletTokenBalancesPrice,
} from "@/server/moralis/evm/wallet";
import { 
    getSolanaPortfolio, 
    mapSolanaPortfolioToUnifiedAssets,
    getSolanaWalletSwapTxs,
    mapSolanaSwapsToUnified
} from "@/server/moralis/solana/wallet";

import { logger } from '@/lib/logger';
// --- EVM Actions ---

export async function getEvmAssets(address: string, chain: string) {
    try {
        const [tokens, native] = await Promise.all([
            getEvmWalletTokenBalancesPrice({ address, chain }),
            getEvmNativeBalance({ address, chain }),
        ]);

        return { tokens, native };
    } catch (error) {
        logger.error("Failed to fetch EVM assets", error);
        return { tokens: [], native: null, error: "Failed to fetch assets" };
    }
}

export async function getEvmActivity(address: string, chain: string, limit = 25) {
    try {
        const { items } = await getEvmWalletHistory({ address, chain, limit });
        return { transactions: items || [] };
    } catch (error) {
        logger.error("Failed to fetch EVM activity", error);
        return { transactions: [], error: "Failed to fetch activity" };
    }
}

export async function getEvmProtocols(address: string, chain: string) {
    try {
        const data = await getEvmDefiPositionsSummary({ address, chain });
        const record = asRecord(data) ?? {};
        const protocols = Array.isArray(record.protocols) ? (record.protocols as UntypedJson[]) : [];
        const totalUsd = toNumber(record.total_usd_value) ?? toNumber(record.totalUsd) ?? 0;
        return { protocols, totalUsd };
    } catch (error) {
        logger.error("Failed to fetch EVM protocols", error);
        return { protocols: [], totalUsd: 0, error: "Failed to fetch protocols" };
    }
}

export async function getEvmApprovals(address: string, chain: string) {
    try {
        const { items } = await getEvmWalletTokenApprovals({ address, chain, limit: 50 });
        return { approvals: items || [] };
    } catch (error) {
        logger.error("Failed to fetch EVM approvals", error);
        return { approvals: [], error: "Failed to fetch approvals" };
    }
}

// --- Solana Actions ---

export async function getSolanaAssets(address: string) {
    try {
        // Use Moralis for Solana Assets (Replaces BirdEye)
        const portfolio = await getSolanaPortfolio({ address, network: "mainnet" });
        const assets = mapSolanaPortfolioToUnifiedAssets(portfolio, { kind: "solana", network: "mainnet" });
        
        const totalUsd = assets.reduce((acc, t) => acc + (t.valueUsd || 0), 0);
        return { tokens: assets, totalUsd, wallet: { address } };
    } catch (error) {
        logger.error("Failed to fetch Solana assets", error);
        // Return empty structure but typed correctly as UnifiedFungibleAsset[] in specific field if needed, 
        // but the caller expects { tokens: ... }
        return { tokens: [], totalUsd: 0, error: "Failed to fetch assets" };
    }
}

export async function getSolanaActivity(address: string, limit = 25) {
    try {
        // Use Moralis for Solana Activity (Replaces BirdEye)
        const swaps = await getSolanaWalletSwapTxs({ address, network: "mainnet", limit });
        const transactions = mapSolanaSwapsToUnified(swaps, address, { kind: "solana", network: "mainnet" });
        
        // The frontend expects { transactions, hasNext } and transactions probably mapped differently?
        // But for now we return UnifiedTransaction[]
        return { transactions, hasNext: false };
    } catch (error) {
        logger.error("Failed to fetch Solana activity", error);
        return { transactions: [], error: "Failed to fetch activity" };
    }
}
