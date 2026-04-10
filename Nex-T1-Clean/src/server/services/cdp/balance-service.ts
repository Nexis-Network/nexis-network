import "server-only";

import { z } from "zod";

import { logger } from "@/lib/logger";
import { getCdpClient } from "@/server/services/cdp/client";

import {
  buildCacheKey,
  getCachedBalance,
  setCachedBalance,
} from "./balance/cache";
import { fetchEvmBalances } from "./balance/fetch-evm";
import { fetchSolanaBalances } from "./balance/fetch-solana";
import { enrichBalancesWithPrices } from "./balance/pricing";
import {
  balanceOptionsSchema,
  batchBalanceEntrySchema,
  multiWalletEntrySchema,
  type BalanceFetchOptions,
  type BatchBalanceEntry,
  type MultiWalletBalanceResult,
  type MultiWalletEntry,
  type WalletBalanceResult,
} from "./balance/types";

export type {
  BalanceFetchOptions,
  BatchBalanceEntry,
  MultiWalletBalanceResult,
  MultiWalletEntry,
  NativeBalance,
  TokenBalance,
  WalletBalanceResult,
} from "./balance/types";

export { enrichBalancesWithPrices } from "./balance/pricing";

type CdpClient = Awaited<ReturnType<typeof getCdpClient>>;

async function fetchFreshBalance(
  address: string,
  options: BalanceFetchOptions,
  cdp?: CdpClient,
): Promise<WalletBalanceResult> {
  const client = cdp ?? (await getCdpClient());

  if (options.platform === "evm") {
    return fetchEvmBalances(client, address, options.chainId);
  }

  return fetchSolanaBalances(client, address);
}

export async function fetchCdpBalances(
  address: string,
  options: BalanceFetchOptions,
): Promise<WalletBalanceResult> {
  const parsed = balanceOptionsSchema.parse(options);
  const cacheKey = buildCacheKey(address, parsed.platform, parsed.chainId);

  if (!parsed.skipCache) {
    const cached = await getCachedBalance(cacheKey);
    if (cached) {
      logger.debug("cdp_balance_cache_hit", {
        address,
        platform: parsed.platform,
        chainId: parsed.chainId ? String(parsed.chainId) : null,
      });
      return cached;
    }
  }

  logger.debug("cdp_balance_fetch_started", {
    address,
    platform: parsed.platform,
    chainId: parsed.chainId ? String(parsed.chainId) : null,
  });

  try {
    const freshResult = await fetchFreshBalance(address, parsed);
    const enriched = await enrichBalancesWithPrices(freshResult);
    await setCachedBalance(cacheKey, enriched);
    return enriched;
  } catch (error) {
    logger.error("cdp_balance_fetch_failed", {
      address,
      platform: parsed.platform,
      chainId: parsed.chainId ? String(parsed.chainId) : null,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function fetchMultiWalletBalances(
  wallets: MultiWalletEntry[],
): Promise<MultiWalletBalanceResult> {
  const validated = z.array(multiWalletEntrySchema).min(1).parse(wallets);
  const settled = await Promise.allSettled(
    validated.map((wallet) =>
      fetchCdpBalances(wallet.address, {
        platform: wallet.platform,
        chainId: wallet.chainId,
      }),
    ),
  );

  let totalUsdValue = 0;
  const results = settled.map((outcome, index) => {
    const wallet = validated[index]!;

    if (outcome.status === "fulfilled") {
      totalUsdValue += outcome.value.totalUsdValue;
      return {
        ...outcome.value,
        status: "fulfilled" as const,
      };
    }

    const errorMessage =
      outcome.reason instanceof Error
        ? outcome.reason.message
        : String(outcome.reason);

    logger.warn("cdp_balance_multi_fetch_wallet_failed", {
      address: wallet.address,
      platform: wallet.platform,
      error: errorMessage,
    });

    return {
      address: wallet.address,
      platform: wallet.platform,
      chainId: wallet.chainId,
      native: {
        symbol: wallet.platform === "evm" ? "ETH" : "SOL",
        balance: "0",
        usdValue: 0,
        decimals: wallet.platform === "evm" ? 18 : 9,
      },
      tokens: [],
      totalUsdValue: 0,
      status: "rejected" as const,
      error: errorMessage,
    };
  });

  return { wallets: results, totalUsdValue };
}

export async function fetchBatchBalances(
  addresses: BatchBalanceEntry[],
): Promise<Map<string, WalletBalanceResult>> {
  const validated = z.array(batchBalanceEntrySchema).min(1).max(100).parse(addresses);
  const cdp = await getCdpClient();
  const settled = await Promise.allSettled(
    validated.map(async (entry) => {
      const cacheKey = buildCacheKey(entry.address, entry.platform, entry.chainId);
      const cached = await getCachedBalance(cacheKey);
      if (cached) {
        return cached;
      }

      const fresh = await fetchFreshBalance(
        entry.address,
        {
          platform: entry.platform,
          chainId: entry.chainId,
        },
        cdp,
      );
      const enriched = await enrichBalancesWithPrices(fresh);
      await setCachedBalance(cacheKey, enriched);
      return enriched;
    }),
  );

  const results = new Map<string, WalletBalanceResult>();
  settled.forEach((outcome, index) => {
    const entry = validated[index]!;
    if (outcome.status === "fulfilled") {
      results.set(entry.address, outcome.value);
      return;
    }

    logger.warn("cdp_batch_balance_entry_failed", {
      address: entry.address,
      platform: entry.platform,
      error:
        outcome.reason instanceof Error
          ? outcome.reason.message
          : String(outcome.reason),
    });
  });

  return results;
}
