import { connection, type NextRequest } from "next/server";
import {
  fetchNexEvmWalletSummary,
  fetchNexSolanaWalletSummary,
} from "@/server/services/nex/wallet-summary";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";


import { logger } from '@/lib/logger';

function readTokenUsdValue(token: Record<string, UntypedJson>): number {
    const raw = token.valueUsd;
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
    }
    if (typeof raw === "string") {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    await connection();
    return timeApiRoute("wallets.portfolio.GET", async () => {
    try {
        const { id } = await params;
        const searchParams = request.nextUrl.searchParams;
        const days = searchParams.get("days") || "30";
        
        let address = "";
        let chainId: string | number = "solana";
        
        // 1. Resolve Wallet Address
        if (id.startsWith("eoa-") || id.startsWith("0x")) {
             // Direct address usage if ID is eoa-ADDRESS
             address = id.replace("eoa-", "");
             // Assume EVM if 0x
             if (address.startsWith("0x")) chainId = 1; 
        } else if (id.includes("-")) {
             // Likely a UUID, lookup in DB
             if (id.startsWith("session-sol-")) {
                 address = id.replace("session-sol-", "");
                 chainId = "solana";
             } else {
                 const qAddress = searchParams.get("address");
                 const qChain = searchParams.get("chainId");
                 if (qAddress) {
                     address = qAddress;
                     chainId = qChain || (address.startsWith("0x") ? 1 : "solana");
                 }
             }
        }
        
        if (!address) {
             return apiResponse.error("INVALID_REQUEST", "Address resolution failed", 400);
        }

        // 2. Fetch History
        let history: { timestamp: number; value: number }[] = [];

        // Simple check for EVM vs Solana
        const isEVM = chainId === 1 || chainId === '1';

        if (isEVM) {
             try {
                 const summary = await fetchNexEvmWalletSummary(address, {
                    includeTokens: true,
                    includeNfts: false,
                    includeTransactions: false,
                    chainIds: [Number(chainId)],
                 });
                 const totalValue = summary.tokens.reduce(
                    (sum, token) => sum + (typeof token.valueUsd === "number" ? token.valueUsd : 0),
                    0,
                 );
                 history = [{
                     timestamp: Date.now(),
                     value: totalValue
                 }];
             } catch (error: UntypedJson) {
                 logger.warn("[Portfolio] EVM summary fetch failed:", error instanceof Error ? error.message : String(error));
                 history = [];
             }
        } else {
             // Solana - Use Nex Wallet Summary (Helius + CoinGecko)
             try {
                 const summary = await fetchNexSolanaWalletSummary(address, {
                    includeTokens: true,
                    includeNfts: true,
                 });
                 const totalValue = summary.tokens.reduce(
                    (acc, token) => acc + readTokenUsdValue(token),
                    0,
                 );
                 
                 history = [{
                     timestamp: Date.now(),
                     value: totalValue
                 }];
             } catch (error) {
                 logger.error("[Portfolio] Solana net worth fetch failed", error);
                 history = [];
             }
        }
        
        return apiResponse.success({
            data: history,
            meta: {
                address,
                chain: chainId,
                period: days
            }
        });

    } catch (error) {
        logger.error("[Portfolio API] Failed", error);
        return apiResponse.internalError("Internal Server Error");
    }
    }); // end timeApiRoute
}
