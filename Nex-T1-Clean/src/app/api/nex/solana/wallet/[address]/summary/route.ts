/**
 * Nex Solana Wallet Summary API
 * GET /api/nex/solana/wallet/[address]/summary
 * 
 * Fetches Solana wallet token balances and NFTs using Helius
 */

import { connection, NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { fetchNexSolanaWalletSummary } from "@/server/services/nex/wallet-summary";


import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  await connection();
  try {
    const { address } = await params;
    
    // Basic Solana address validation (base58, 32-44 chars)
    if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return apiResponse.badRequest("Invalid Solana address");
    }

    const { searchParams } = new URL(request.url);
    const tokensCursor = Number(searchParams.get("tokensCursor") ?? 0);
    const nftsCursor = Number(searchParams.get("nftsCursor") ?? 0);
    const limit = Number(searchParams.get("limit") ?? 25);
    const includeTokens = searchParams.get("includeTokens") !== "false";
    const includeNfts = searchParams.get("includeNfts") !== "false";
    const includeTransactions = searchParams.get("includeTransactions") !== "false";
    const transactionLimit = Number(searchParams.get("transactionLimit") ?? 25);
    const skipCache = searchParams.get("skipCache") === "true";

    const summary = await fetchNexSolanaWalletSummary(address, {
      tokensCursor,
      nftsCursor,
      limit,
      includeTokens,
      includeNfts,
      includeTransactions,
      transactionLimit,
      skipCache,
    });

    const response = apiResponse.success(summary);
    response.headers.set("Cache-Control", "private, max-age=30");
    return response;
  } catch (error) {
    logger.error("[Nex Solana Summary] Error:", error);
    return apiResponse.internalError(error instanceof Error ? error.message : "Internal error");
  }
}

