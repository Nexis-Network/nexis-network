import { createPublicClient, formatUnits, http, type Address, type Hex } from "viem";

import { findSupportedChain, resolveDefaultRpcUrl } from "@/lib/chains";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { getSafeTargetChains } from "@/server/services/safe/chains";


import { logger } from '@/lib/logger';
type AgentTradeRow = {
  id: string;
  tx_hash: string | null;
  chain_id: number | null;
  wallet_address: string | null;
  balance_pre: UntypedJson | null;
  balance_post: UntypedJson | null;
  fees_breakdown: UntypedJson | null;
  fees_usd: string | number | null;
};

type EnrichEvmAgentTradesOptions = {
  sinceIso: string;
  limit?: number;
};

type EnrichEvmAgentTradesResult = {
  scanned: number;
  updated: number;
  skipped: number;
  errors: number;
};

function isEvmTxHash(value: string): value is Hex {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isEvmAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function toObject(value: UntypedJson): Record<string, UntypedJson> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, UntypedJson>;
  return null;
}

function resolveRpcUrl(chainId: number): string | null {
  try {
    // Background agent uses "enterprise" tier to access premium RPCs if configured
    const safe = getSafeTargetChains("enterprise").find((chain) => chain.chainId === chainId);
    if (safe?.rpcUrl) return safe.rpcUrl;
  } catch {
    // Ignore SAFE_HYPEREVM misconfig; fall back to built-in chain defaults.
  }
  return resolveDefaultRpcUrl(chainId);
}

function coingeckoCoinIdForNativeSymbol(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase();
  switch (normalized) {
    case "ETH":
      return "ethereum";
    case "BNB":
      return "binancecoin";
    case "MATIC":
      return "matic-network";
    case "AVAX":
      return "avalanche-2";
    default:
      return null;
  }
}

async function fetchCoingeckoUsdPrice(coinId: string): Promise<number | null> {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", coinId);
  url.searchParams.set("vs_currencies", "usd");
  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const json = (await response.json().catch(() => null));
  const value = json?.[coinId]?.usd;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function enrichEvmAgentTrades(options: EnrichEvmAgentTradesOptions): Promise<EnrichEvmAgentTradesResult> {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(100, options.limit ?? 50)) : 50;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("agent_trade")
    .select("id,tx_hash,chain_id,wallet_address,balance_pre,balance_post,fees_breakdown,fees_usd")
    .gte("executed_at", options.sinceIso)
    .not("tx_hash", "is", null)
    .not("chain_id", "is", null)
    .not("wallet_address", "is", null)
    .or("balance_pre.is.null,balance_post.is.null,fees_breakdown.is.null,fees_usd.is.null")
    .order("executed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AgentTradeRow[];
  const priceCache = new Map<string, number | null>();

  const result: EnrichEvmAgentTradesResult = { scanned: rows.length, updated: 0, skipped: 0, errors: 0 };

  for (const row of rows) {
    const txHash = typeof row.tx_hash === "string" ? row.tx_hash.trim() : "";
    const walletAddress = typeof row.wallet_address === "string" ? row.wallet_address.trim() : "";
    const chainId = typeof row.chain_id === "number" ? row.chain_id : null;

    if (!chainId || !isEvmTxHash(txHash) || !isEvmAddress(walletAddress)) {
      result.skipped += 1;
      continue;
    }

    const chain = findSupportedChain(chainId);
    const rpcUrl = resolveRpcUrl(chainId);
    if (!chain || !rpcUrl) {
      result.skipped += 1;
      continue;
    }

    const needsBalancePre = row.balance_pre == null;
    const needsBalancePost = row.balance_post == null;
    const needsFeesBreakdown = row.fees_breakdown == null;
    const needsFeesUsd = row.fees_usd == null;

    if (!needsBalancePre && !needsBalancePost && !needsFeesBreakdown && !needsFeesUsd) {
      result.skipped += 1;
      continue;
    }

    try {
      const client = createPublicClient({ chain, transport: http(rpcUrl) });
      const receipt = await client.getTransactionReceipt({ hash: txHash });

      const nativeSymbol = chain.nativeCurrency.symbol;
      const nativeDecimals = chain.nativeCurrency.decimals;

      const gasUsed = receipt.gasUsed ?? 0n;
      const effectiveGasPrice = (receipt).effectiveGasPrice ?? null;
      const gasPriceWei = typeof effectiveGasPrice === "bigint" ? effectiveGasPrice : null;
      const gasFeeWei = gasPriceWei != null ? gasUsed * gasPriceWei : null;

      const coinId = coingeckoCoinIdForNativeSymbol(nativeSymbol);
      const priceUsd =
        coinId == null
          ? null
          : priceCache.has(coinId)
            ? (priceCache.get(coinId) ?? null)
            : await fetchCoingeckoUsdPrice(coinId).then((price) => {
                priceCache.set(coinId, price);
                return price;
              });

      const gasFeeNative = gasFeeWei != null ? formatUnits(gasFeeWei, nativeDecimals) : null;
      const gasFeeUsd =
        gasFeeNative != null && priceUsd != null && Number.isFinite(Number(gasFeeNative))
          ? Number(gasFeeNative) * priceUsd
          : null;

      const blockNumber = receipt.blockNumber ?? null;
      const preBlock = blockNumber != null && blockNumber > 0n ? blockNumber - 1n : null;

      const update: Record<string, UntypedJson> = {};

      if (needsFeesBreakdown || needsFeesUsd) {
        const existing = toObject(row.fees_breakdown) ?? {};
        const next = {
          ...existing,
          gas: {
            chainId,
            txHash,
            blockNumber: blockNumber != null ? blockNumber.toString() : null,
            gasUsed: gasUsed.toString(),
            effectiveGasPriceWei: gasPriceWei != null ? gasPriceWei.toString() : null,
            feeWei: gasFeeWei != null ? gasFeeWei.toString() : null,
            feeNative: gasFeeNative,
            feeUsd: gasFeeUsd != null ? String(gasFeeUsd) : null,
            nativeSymbol,
            nativeDecimals,
          },
        };

        update.fees_breakdown = next;
        if (needsFeesUsd && gasFeeUsd != null) {
          update.fees_usd = String(gasFeeUsd);
        }
      }

      if (needsBalancePre && preBlock != null) {
        const balanceWei = await client.getBalance({ address: walletAddress, blockNumber: preBlock });
        const balanceNative = formatUnits(balanceWei, nativeDecimals);
        const balanceUsd =
          priceUsd != null && Number.isFinite(Number(balanceNative)) ? String(Number(balanceNative) * priceUsd) : null;

        update.balance_pre = {
          chainId,
          walletAddress,
          txHash,
          blockNumber: preBlock.toString(),
          native: {
            symbol: nativeSymbol,
            decimals: nativeDecimals,
            balanceWei: balanceWei.toString(),
            balanceNative,
            balanceUsd,
          },
          capturedBy: "cron:agent-trades/reconcile",
          capturedAt: new Date().toISOString(),
        };
      }

      if (needsBalancePost && blockNumber != null) {
        const balanceWei = await client.getBalance({ address: walletAddress, blockNumber });
        const balanceNative = formatUnits(balanceWei, nativeDecimals);
        const balanceUsd =
          priceUsd != null && Number.isFinite(Number(balanceNative)) ? String(Number(balanceNative) * priceUsd) : null;

        update.balance_post = {
          chainId,
          walletAddress,
          txHash,
          blockNumber: blockNumber.toString(),
          native: {
            symbol: nativeSymbol,
            decimals: nativeDecimals,
            balanceWei: balanceWei.toString(),
            balanceNative,
            balanceUsd,
          },
          capturedBy: "cron:agent-trades/reconcile",
          capturedAt: new Date().toISOString(),
        };
      }

      if (Object.keys(update).length === 0) {
        result.skipped += 1;
        continue;
      }

      const { error: updateError } = await supabase.from("agent_trade").update(update).eq("id", row.id);
      if (updateError) {
        result.errors += 1;
        continue;
      }

      result.updated += 1;
    } catch (error) {
      logger.warn("agent_trade_evm_enrich_failed", { id: row.id, chainId, txHash }, error);
      result.errors += 1;
    }
  }

  return result;
}

