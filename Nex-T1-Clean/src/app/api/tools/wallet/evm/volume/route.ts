import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { getEvmWalletHistory, toUnifiedEvmChain } from "@/server/moralis/evm/wallet";
import { normalizeEvmAddress } from "@/server/moralis/validation";
import { getCoinSnapshotsByIds } from "@/server/market/coingecko";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  chain: z.string().optional(),
  windowHours: z.coerce.number().int().min(1).max(24 * 30).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const NATIVE_META_BY_CHAIN_ID: Record<number, { symbol: string; coingeckoId: string; decimals: number }> = {
  1: { symbol: "ETH", coingeckoId: "ethereum", decimals: 18 },
  8453: { symbol: "ETH", coingeckoId: "ethereum", decimals: 18 },
  42161: { symbol: "ETH", coingeckoId: "ethereum", decimals: 18 },
  10: { symbol: "ETH", coingeckoId: "ethereum", decimals: 18 },
  56: { symbol: "BNB", coingeckoId: "binancecoin", decimals: 18 },
  137: { symbol: "POL", coingeckoId: "matic-network", decimals: 18 },
  43114: { symbol: "AVAX", coingeckoId: "avalanche-2", decimals: 18 },
  59144: { symbol: "ETH", coingeckoId: "ethereum", decimals: 18 },
};

function toUnixMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function scaleFromWei(raw: string, decimals: number): number {
  // Use a string->number conversion guarded by clamping; volume is approximate by design.
  const big = BigInt(raw);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = big / base;
  const frac = big % base;
  const fracNum = Number(frac) / Number(base);
  return Number(whole) + fracNum;
}

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.evm.volume.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.evm.volume", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      chain: url.searchParams.get("chain") ?? undefined,
      windowHours: url.searchParams.get("windowHours") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    try {
      const address = normalizeEvmAddress(parsed.data.address);
      const chain = toUnifiedEvmChain(parsed.data.chain ?? null);
      const chainId = parseInt(chain.chain, 16);
      const meta = NATIVE_META_BY_CHAIN_ID[chainId] ?? NATIVE_META_BY_CHAIN_ID[1];
      const windowHours = parsed.data.windowHours ?? 24;
      const limit = parsed.data.limit ?? 100;
      const cutoffMs = Date.now() - windowHours * 60 * 60 * 1000;

      const [history, priceRow] = await Promise.all([
        getEvmWalletHistory({ address, chain: chain.chain, limit, includeInternalTransactions: true, includeDecoded: false }),
        getCoinSnapshotsByIds([meta.coingeckoId], { vsCurrency: "usd", priceChangePercentage: "24h" }).then((rows) => rows[0] ?? null),
      ]);

      const coinPriceUsd =
        typeof priceRow?.currentPrice === "number" && Number.isFinite(priceRow.currentPrice) ? priceRow.currentPrice : null;

      let volumeNative = 0;
      let txCount = 0;

      for (const tx of history.items ?? []) {
        const ts = toUnixMs(tx.block_timestamp);
        if (ts != null && ts < cutoffMs) continue;
        const valueRaw = typeof tx.value === "string" ? tx.value : null;
        if (!valueRaw) continue;
        // Native volume approximation: sum transaction "value" field only.
        volumeNative += scaleFromWei(valueRaw, meta.decimals);
        txCount += 1;
      }

      const volumeUsd = coinPriceUsd != null ? volumeNative * coinPriceUsd : null;

      const response = apiResponse.success({
        address,
        chain,
        windowHours,
        nativeSymbol: meta.symbol,
        coinPriceUsd,
        volumeNative,
        volumeUsd: volumeUsd != null && Number.isFinite(volumeUsd) ? volumeUsd : null,
        txCount,
        limitations: [
          "EVM volume is approximated as sum of native coin value transferred in transactions (excludes ERC20 transfers and DEX swap notionals).",
        ],
      });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
      return auth.bridge.commit(response);
    } catch (error) {
      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
