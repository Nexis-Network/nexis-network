import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  createRateLimitResponse,
  handleRequestRateLimit,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";

import { authorizeCdpWalletBalanceRequest } from "./route.auth";
import { parseCdpWalletBalanceRequest } from "./route.schema";
import { getCdpWalletBalance } from "./route.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  await connection();

  return timeApiRoute("cdp.wallets.balance.GET", async () => {
    try {
      const rateLimit = await handleRequestRateLimit(request, "cdp-wallet-balance");
      if (!rateLimit.success) {
        return createRateLimitResponse(rateLimit.errorResponse);
      }

      const { address } = await params;
      const parsed = parseCdpWalletBalanceRequest({
        address,
        requestUrl: request.url,
      });
      if (!parsed.success) {
        return apiResponse.validationError(parsed.error);
      }

      const authorization = await authorizeCdpWalletBalanceRequest(
        request,
        parsed.data.params.address,
      );
      if (authorization.response) {
        return authorization.response;
      }

      const balance = await getCdpWalletBalance({
        address: authorization.walletAddress!,
        platform: parsed.data.query.platform,
        chainId: parsed.data.query.chainId,
      });

      return apiResponse.success(balance);
    } catch (error) {
      logger.error("cdp_wallet_balance_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return apiResponse.internalError("Failed to fetch wallet balance");
    }
  });
}

