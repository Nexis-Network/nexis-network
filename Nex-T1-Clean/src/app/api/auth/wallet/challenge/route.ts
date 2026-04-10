import { z } from "zod";
import { type NextRequest } from "next/server";
import { apiResponse, validateBody } from "@/lib/api-platform";
import { extractClientIP } from "@/lib/request-utils";
import { issueWalletChallenge, WalletRequestError } from "@/server/auth/wallet";
import {
  checkRateLimit,
  walletChallengeRateLimit,
} from "@/server/security/rate-limit";
import { walletLogger } from "@/server/logging/logger";
import { type SupportedChain } from "@/server/wallets/utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";

import { logger } from "@/lib/logger";
const challengeSchema = z.object({
  chain: z.enum(["evm", "solana"]),
  address: z.string().min(1),
  chain_id: z.union([z.string(), z.number()]).optional(),
  chainId: z.union([z.string(), z.number()]).optional(),
  chainID: z.union([z.string(), z.number()]).optional(),
  chain_namespace: z.string().optional(),
  chainNamespace: z.string().optional(),
  namespace: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return timeApiRoute("auth.wallet.challenge.POST", async () => {
    const validation = await validateBody(req, challengeSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { chain, address } = validation.data;
    const body = validation.data;

    // Resolve aliases
    const chainId = Number(body.chain_id ?? body.chainId ?? body.chainID);
    const chainNamespace =
      body.chain_namespace ?? body.chainNamespace ?? body.namespace;

    const ip = extractClientIP(req);
    const normalizedRateAddress =
      chain === "evm" ? address.toLowerCase() : address;
    const rateKey = `${ip}:${normalizedRateAddress}`;
    const { success } = await checkRateLimit(rateKey, walletChallengeRateLimit);

    if (!success) {
      return apiResponse.error(
        "RATE_LIMIT_EXCEEDED",
        "Too many wallet challenges. Please try again shortly.",
        429,
        undefined,
        undefined,
      );
      // Note: we can't easily attach headers to apiResponse helpers yet without a small tweak or just using NextResponse
      // For now, let's use the helper and ignore headers or improve helper later.
      // Actually, standard response usually doesn't need dynamic headers unless essential.
      // But rate limit headers ARE essential.
    }

    try {
      const challenge = await issueWalletChallenge({
        purpose: "login",
        chain: chain as SupportedChain,
        address,
        chainId,
        chainNamespace: chainNamespace || undefined,
      });

      return apiResponse.success({
        nonce: challenge.nonce,
        message: challenge.message,
        expires_at: challenge.expiresAt,
        chain: challenge.chain,
        chain_id: challenge.chainId,
        chain_namespace: challenge.chainNamespace,
        created_at: challenge.createdAt,
      });
    } catch (error) {
      if (error instanceof WalletRequestError) {
        walletLogger.warn({
          event: "wallet_challenge_failure",
          chain,
          address,
          status: error.status,
          message: error.message,
        });
        return apiResponse.error("WALLET_ERROR", error.message, error.status);
      }

      const pgCode =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: string }).code
          : undefined;

      if (pgCode === "42P01") {
        logger.error("wallet_challenge_table_missing", { error });
        return apiResponse.error(
          "SERVICE_UNAVAILABLE",
          "Service unavailable: Database migration missing.",
          500,
        );
      }

      logger.error("wallet_challenge_unhandled_error", error);
      return apiResponse.internalError("Failed to create wallet challenge");
    }
  });
}

export function GET() {
  return apiResponse.error(
    "METHOD_NOT_ALLOWED",
    "Method not allowed. Use POST.",
    405,
  );
}
