import { parseBalanceToNumber } from "@/lib/cdp/cdp-balance-format";
import {
  resolveCoinGeckoNativeAssetId,
  resolveCoinGeckoPlatformForChain,
} from "@/lib/cdp/cdp-chain-support";
import { logger } from "@/lib/logger";
import {
  getCoinPricesByIds,
  getTokenPricesByContracts,
} from "@/server/market/coingecko";

import type { WalletBalanceResult } from "./types";

export async function enrichBalancesWithPrices(
  result: WalletBalanceResult,
): Promise<WalletBalanceResult> {
  try {
    const nativeCoinId = resolveCoinGeckoNativeAssetId(
      result.platform,
      result.chainId,
    );
    const platform =
      result.platform === "solana"
        ? "solana"
        : resolveCoinGeckoPlatformForChain(result.chainId);
    const tokenAddresses = result.tokens.map((token) => token.address).filter(Boolean);

    const [nativePrices, tokenPriceMap] = await Promise.all([
      getCoinPricesByIds([nativeCoinId]),
      tokenAddresses.length > 0
        ? getTokenPricesByContracts(platform, tokenAddresses)
        : Promise.resolve(
            {} as Record<string, { usd?: number; usd_24h_change?: number }>,
          ),
    ]);

    const nativePrice = nativePrices[nativeCoinId]?.usd;
    const nativeAmount = parseBalanceToNumber(
      result.native.balance,
      result.native.decimals,
    );
    const nativeUsdValue =
      typeof nativePrice === "number" && nativeAmount != null
        ? nativeAmount * nativePrice
        : result.native.usdValue;

    const tokens = result.tokens.map((token) => {
      const tokenPrice =
        tokenPriceMap[token.address.toLowerCase()]?.usd ??
        tokenPriceMap[token.address]?.usd;
      const tokenAmount = parseBalanceToNumber(token.balance, token.decimals);
      const usdValue =
        typeof tokenPrice === "number" && tokenAmount != null
          ? tokenAmount * tokenPrice
          : token.usdValue;

      return {
        ...token,
        usdValue,
      };
    });

    return {
      ...result,
      native: {
        ...result.native,
        usdValue: nativeUsdValue,
      },
      tokens,
      totalUsdValue:
        nativeUsdValue + tokens.reduce((sum, token) => sum + token.usdValue, 0),
    };
  } catch (error) {
    logger.warn("cdp_balance_price_enrichment_failed", {
      address: result.address,
      platform: result.platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }
}

