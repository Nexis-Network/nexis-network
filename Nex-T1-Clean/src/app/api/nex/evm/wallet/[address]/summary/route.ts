/**
 * Nex EVM Wallet Summary API
 * GET /api/nex/evm/wallet/[address]/summary
 * 
 * Fetches wallet token balances across EVM chains using viem
 */

import { connection, NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { apiResponse } from "@/lib/api-platform";
import { fetchNexEvmWalletSummary } from "@/server/services/nex/wallet-summary";


import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  await connection();
  try {
    const { address } = await params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return apiResponse.badRequest("Invalid EVM address");
    }

    const { searchParams } = new URL(request.url);
    const tokensCursor = Number(searchParams.get("tokensCursor") ?? 0);
    const nftsCursor = Number(searchParams.get("nftsCursor") ?? 0);
    const limit = Number(searchParams.get("limit") ?? 25);
    const includeTokens = searchParams.get("includeTokens") !== "false";
    const includeNfts = searchParams.get("includeNfts") !== "false";
    const skipCache = searchParams.get("skipCache") === "true";

    const summary = await fetchNexEvmWalletSummary(address, {
      tokensCursor,
      nftsCursor,
      limit,
      includeTokens,
      includeNfts,
      skipCache,
    });

    const etag = createHash("sha1").update(JSON.stringify(summary)).digest("hex");
    const clientEtag = request.headers.get("if-none-match");

    const lastModified = summary.fetchedAt ? new Date(summary.fetchedAt).toUTCString() : new Date().toUTCString();

    if (clientEtag && clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
          "Last-Modified": lastModified,
        },
      });
    }

    const response = apiResponse.success(summary);
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    response.headers.set("ETag", etag);
    response.headers.set("Last-Modified", lastModified);
    return response;
  } catch (error) {
    logger.error("[Nex EVM Summary] Error:", error);
    return apiResponse.internalError(error instanceof Error ? error.message : "Internal error");
  }
}

