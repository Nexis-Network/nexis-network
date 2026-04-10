'use server';

import { createClient } from '@/server/services/supabase/server';
import { birdeyeFetch } from '@/lib/birdeye/client';
import { moralisRequest, MoralisError } from '@/server/moralis/client';
import { TokenListResponse, WalletNetWorth, TransactionListResponse, TransactionHistoryItem, TokenListToken } from '@/types/birdeye';
import { revalidatePath } from 'next/cache';


import { logger } from '@/lib/logger';

type WalletRecord = {
  id: string;
  address: string;
  chain_id: number | null;
  wallet_type: string;
  metadata: Record<string, UntypedJson> | null;
};
/**
 * Syncs wallet data (Net Worth, Holdings, PnL) from Provider to Supabase.
 * @param walletId - The UUID of the wallet in the `user_wallets` table.
 */
export async function syncWalletData(walletId: string) {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Supabase client failed' };

  // 1. Get Wallet Details
  const { data: wallet, error: walletError } = await supabase
    .from('user_wallets')
    .select('id, address, chain_id, wallet_type, metadata')
    .eq('id', walletId)
    .single();

  if (walletError || !wallet) {
    logger.error('❌ Sync Failed: Wallet not found', walletError);
    return { success: false, error: 'Wallet not found' };
  }

  // Dispatch based on chain/type
  if (wallet.wallet_type.includes('evm') || wallet.wallet_type === 'safe' || wallet.wallet_type === 'smart_wallet') {
      return syncEvmWallet(supabase, wallet);
  } else {
      // Default to Solana for now (or explicit check)
      return syncSolanaWallet(supabase, wallet);
  }
}

async function syncEvmWallet(supabase: UntypedJson, wallet: WalletRecord) {
    const address = wallet.address;
    const chainId = wallet.chain_id || 1; // Default to Mainnet if missing
    // Hex chain for Moralis
    const chainHex = "0x" + Number(chainId).toString(16);

    logger.debug(`🔄 Syncing EVM Wallet ${address} (Chain ${chainId})...`);

    try {
        // 1. Fetch Net Worth & Assets from Moralis
        // Endpoint: /wallets/{address}/net-worth
        let netWorthData = { total_networth_usd: 0 };
        try {
            netWorthData = await moralisRequest<UntypedJson>({
                api: 'evm',
                path: `wallets/${address}/net-worth`,
                query: { chain: chainHex, exclude_spam: 'true', exclude_unverified_contracts: 'true' }
            });
        } catch (error: UntypedJson) {
             if (error instanceof MoralisError && (error.errorType === 'not_found' || error.meta?.status === 404)) {
                 // Wallet not found or empty, default to 0
                 netWorthData = { total_networth_usd: 0 };
             } else {
                 throw error;
             }
        }

        // 2. Fetch PnL/Profitability
        // Endpoint: /wallets/{address}/profitability (if available) or rely on computed stats
        let pnlData = { total_profit_usd: 0, total_profit_percentage: 0 };
        try {
             const profitability = await moralisRequest<UntypedJson>({
                api: 'evm',
                path: `wallets/${address}/profitability`,
                query: { chain: chainHex }
            });
            if (profitability) {
                pnlData = profitability;
            }
        } catch {
            // Ignore PnL errors (endpoint might not be available on all plans/chains)
        }

        // 3. Update Database
        
        // 3.1 Insert Portfolio Snapshot
        const totalUsd = Number(netWorthData?.total_networth_usd ?? 0);
        await supabase.from('portfolio_snapshots').insert({
            user_wallet_id: wallet.id,
            total_usd: totalUsd,
            metadata: { source: 'moralis', chain_id: chainId }
        });

        // 3.2 Upsert Token Holdings
        // Moralis Net Worth response includes `chains` -> `native_balance` + `tokens` usually, 
        // OR we might need separate /erc20 endpoint. 
        // usage of `net-worth` endpoint typically returns aggregated view.
        // Let's assume we need to iterate or fetch specific token balances if net-worth doesn't provide full list details suitable for rows.
        // Actually, `/wallets/{address}/tokens` is better for the list.
        
        let tokensData = [];
        try {
            tokensData = await moralisRequest<UntypedJson[]>({
                api: 'evm',
                path: `wallets/${address}/tokens`,
                query: { chain: chainHex, exclude_spam: 'true' }
            });
        } catch (error: UntypedJson) {
             if (error instanceof MoralisError && (error.errorType === 'not_found' || error.meta?.status === 404)) {
                 // Wallet not found or empty
                 tokensData = [];
             } else {
                 throw error;
             }
        }

        if (tokensData && Array.isArray(tokensData)) {
            const holdings = tokensData.map((token) => ({
                user_wallet_id: wallet.id,
                chain: 'evm', // or specific chain_id
                token_address: token.token_address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                amount: token.balance, 
                ui_amount: Number(token.balance) / Math.pow(10, Number(token.decimals)),
                price_usd: token.usd_price,
                value_usd: token.usd_value, // Moralis often computed this
                logo_url: token.logo || token.thumbnail,
                last_updated: new Date().toISOString(),
                metadata: { chain_id: chainId }
            }));

            // Filter out zero value/dust if needed, or keep all
            const validHoldings = holdings.filter(h => h.ui_amount > 0);

            if (validHoldings.length > 0) {
                 const { error: holdingsError } = await supabase
                    .from('token_holdings')
                    .upsert(validHoldings, { 
                        onConflict: 'user_wallet_id,chain,token_address', // Note: schema might need chain_id in constraint or we use 'evm' + address
                        ignoreDuplicates: false 
                    });
                 if (holdingsError) logger.error('Error upserting EVM holdings:', holdingsError);
            }
        }

        // 3.3 Transactions (Skipping for now or quick fetch)
        // Moralis transaction history is heavy. Left as future enhancement or separate trigger.

        logger.debug('✅ EVM Sync Complete');

        // 4. Update Wallet Metadata
        const currentMeta = wallet.metadata || {};
        await supabase.from('user_wallets').update({
            metadata: {
                ...currentMeta,
                netWorthUsd: totalUsd,
                pnl24h: Number(pnlData?.total_profit_usd ?? 0),
                change24h: Number(pnlData?.total_profit_percentage ?? 0),
                lastSyncedAt: new Date().toISOString()
            }
        }).eq('id', wallet.id);

        revalidatePath('/dashboard');
        return { success: true };

    } catch (error: UntypedJson) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('❌ EVM Sync Failed:', message);
        return { success: false, error: message || 'EVM Sync failed' };
    }
}

async function syncSolanaWallet(supabase: UntypedJson, wallet: WalletRecord) {
  const address = wallet.address;
  const chain = 'solana';

  logger.debug(`🔄 Syncing Solana Wallet ${address}...`);

  try {
    const query = `?wallet=${address}`;
    
    // 2.1 Fetch Net Worth
    const netWorth = await birdeyeFetch<WalletNetWorth>(`v2/wallet/net_worth${query}`, { chain, version: 'v2' });
    
    // 2.2 Fetch Holdings
    const tokenList = await birdeyeFetch<TokenListResponse>(`v1/wallet/token_list${query}`, { chain, version: 'v1' });
    
    // 2.3 Fetch PnL Summary
    let pnlData = null;
    try {
        pnlData = await birdeyeFetch<UntypedJson>(`v2/wallet/pnl/summary${query}`, { chain, version: 'v2' });
    } catch {
        // logger.warn('PnL fetch failed:', e);
    }
    
    // 2.4 Fetch Transaction History
    let transactions: TransactionHistoryItem[] = [];
    try {
        const txRes = await birdeyeFetch<TransactionListResponse>(`v1/wallet/tx_list${query}&limit=50`, { chain, version: 'v1' });
        if (txRes && txRes.items) {
            transactions = txRes.items;
        }
    } catch (e) {
        logger.warn('Transaction history fetch failed:', e);
    }


    // 3. Update Database
    
    // 3.1 Insert Portfolio Snapshot
    const totalUsd = netWorth.totalUsd;
    await supabase.from('portfolio_snapshots').insert({
        user_wallet_id: wallet.id,
        total_usd: totalUsd,
        metadata: { source: 'birdeye' }
    });

    // 3.2 Upsert Token Holdings
    if (tokenList.items && tokenList.items.length > 0) {
        const holdings = tokenList.items.map((token: TokenListToken) => ({
            user_wallet_id: wallet.id,
            chain: chain,
            token_address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            amount: token.balance, // Raw numeric
            ui_amount: token.uiAmount,
            price_usd: token.priceUsd,
            value_usd: token.valueUsd,
            logo_url: token.logoURI || token.icon,
            last_updated: new Date().toISOString()
        }));

        const { error: holdingsError } = await supabase
            .from('token_holdings')
            .upsert(holdings, { 
                onConflict: 'user_wallet_id,chain,token_address',
                ignoreDuplicates: false 
            });

        if (holdingsError) logger.error('Error upserting holdings:', holdingsError);
    }
    
    // 3.3 Upsert Transactions
    if (transactions.length > 0) {
         const txRecords = transactions.map((tx: TransactionHistoryItem) => ({
             user_wallet_id: wallet.id,
             chain: chain,
             tx_hash: tx.txHash,
             block_number: tx.blockNumber,
             block_time: tx.blockTime,
             from_address: tx.from,
             to_address: tx.to,
             value: 0, // Birdeye Main Action summary often cleaner
             type: tx.mainAction, // Use main action as type
             status: tx.status ? 'success' : 'failed',
             metadata: { 
                 fee: tx.fee, 
                 balanceChange: tx.balanceChange 
             }
         }));

         const { error: txError } = await supabase
             .from('user_transactions')
             .upsert(txRecords, {
                 onConflict: 'user_wallet_id,chain,tx_hash',
                 ignoreDuplicates: true
             });
             
        if (txError) logger.error('Error upserting transactions:', txError);
    }
    
    logger.debug('✅ Solana Sync Complete');

    // 4. Update Wallet Metadata (PnL & Net Worth Cache)
    const pnl24h = pnlData?.totalPnlUsd ?? 0;
    const change24h = pnlData?.totalPnlPercent ?? 0;
    
    const currentMeta = wallet.metadata || {};
    
    await supabase.from('user_wallets').update({
        metadata: {
            ...currentMeta,
            netWorthUsd: netWorth.totalUsd,
            pnl24h: pnl24h,
            change24h: change24h,
            lastSyncedAt: new Date().toISOString()
        }
    }).eq('id', wallet.id);

    revalidatePath('/dashboard');
    return { success: true };

  } catch (error) {
    logger.error('❌ Solana Sync Failed:', error);
    return { success: false, error: 'Solana Sync failed' };
  }
}
