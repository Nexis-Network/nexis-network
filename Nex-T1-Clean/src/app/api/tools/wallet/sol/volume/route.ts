import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { enforceToolRateLimit, requireUserContext, toolErrorResponse } from "@/app/api/tools/_utils";
import { MoralisConfigError, MoralisError } from "@/server/moralis/client";
import { getSolanaWalletSwapTxs, toUnifiedSolanaChain } from "@/server/moralis/solana/wallet";
import { asRecord, toNumber } from "@/server/moralis/utils";
import { normalizeSolanaAddress, normalizeSolanaNetwork } from "@/server/moralis/validation";
import { timeApiRoute } from "@/server/instrumentation/metrics";


const querySchema = z.object({
  address: z.string().min(1),
  network: z.string().optional(),
  windowHours: z.coerce.number().int().min(1).max(24 * 30).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

function toUnixMs(raw: UntypedJson): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Moralis sometimes returns seconds; assume seconds when too small.
    return raw < 10_000_000_000 ? raw * 1000 : raw;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed < 10_000_000_000 ? parsed * 1000 : parsed;
    }
    const date = Date.parse(raw);
    return Number.isNaN(date) ? null : date;
  }
  return null;
}

function createDegradedVolumeResponse(params: {
  address: string;
  chain: ReturnType<typeof toUnifiedSolanaChain>;
  windowHours: number;
  reason: string;
}): Response {
  const response = apiResponse.success({
    address: params.address,
    chain: params.chain,
    windowHours: params.windowHours,
    volumeUsd: null,
    swapCount: 0,
    degraded: true,
    unavailableReason: params.reason,
  });
  response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  response.headers.set("X-Wallet-Volume-Fallback", "degraded");
  response.headers.set("X-Wallet-Volume-Fallback-Reason", params.reason);
  return response;
}

function resolveFallbackReason(error: unknown): string | null {
  if (error instanceof MoralisConfigError) {
    return "not_configured";
  }

  if (!(error instanceof MoralisError)) {
    return null;
  }

  if (error.errorType === "rate_limit") return "rate_limited";
  if (error.errorType === "billing") return "billing_unavailable";
  if (error.errorType === "auth") return "upstream_auth";
  if (error.isRecoverable) return "upstream_unavailable";

  return null;
}

export async function GET(request: Request) {
  await connection();
  return timeApiRoute("tools.wallet.sol.volume.GET", async () => {
    const auth = await requireUserContext(request);
    if (!auth.ok) return auth.response;

    const rl = await enforceToolRateLimit({ request, route: "wallet.sol.volume", userId: auth.userId });
    if (!rl.ok) return auth.bridge.commit(rl.response);

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      address: url.searchParams.get("address"),
      network: url.searchParams.get("network") ?? undefined,
      windowHours: url.searchParams.get("windowHours") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return auth.bridge.commit(apiResponse.validationError(parsed.error));
    }

    const windowHours = parsed.data.windowHours ?? 24;
    let fallbackContext:
      | {
          address: string;
          chain: ReturnType<typeof toUnifiedSolanaChain>;
          windowHours: number;
        }
      | null = null;

    try {
      const address = normalizeSolanaAddress(parsed.data.address);
      const network = normalizeSolanaNetwork(parsed.data.network ?? undefined);
      const chain = toUnifiedSolanaChain(network);
      fallbackContext = { address, chain, windowHours };
      const limit = parsed.data.limit ?? 100;
      const cutoffMs = Date.now() - windowHours * 60 * 60 * 1000;

      const payload = await getSolanaWalletSwapTxs({ address, network, limit, cursor: null, order: "DESC" });
      const record = asRecord(payload) ?? {};
      const items = (record.result ?? record.swaps ?? record.items) as UntypedJson;
      const swaps = Array.isArray(items) ? items : [];

      let volumeUsd = 0;
      let counted = 0;

      for (const swap of swaps) {
        const timestampMs =
          toUnixMs((swap as Record<string, UntypedJson>)?.blockTime) ??
          toUnixMs((swap as Record<string, UntypedJson>)?.timestamp) ??
          toUnixMs((swap as Record<string, UntypedJson>)?.block_timestamp);
        if (timestampMs != null && timestampMs < cutoffMs) {
          continue;
        }
        const v = toNumber((swap as Record<string, UntypedJson>)?.valueUsd ?? (swap as Record<string, UntypedJson>)?.usdValue);
        if (typeof v === "number" && Number.isFinite(v)) {
          volumeUsd += v;
          counted += 1;
        }
      }

      const response = apiResponse.success({
        address,
        chain,
        windowHours,
        volumeUsd,
        swapCount: counted,
      });
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
      return auth.bridge.commit(response);
    } catch (error) {
      const fallbackReason = resolveFallbackReason(error);
      if (fallbackContext && fallbackReason) {
        return auth.bridge.commit(
          createDegradedVolumeResponse({
            ...fallbackContext,
            reason: fallbackReason,
          }),
        );
      }

      return auth.bridge.commit(toolErrorResponse(error));
    }
  });
}
