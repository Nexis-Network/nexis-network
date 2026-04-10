import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import {
  createEmptySettingsPortfolioSummary,
  isSettingsPortfolioWalletFilter,
  isSettingsPortfolioRange,
} from "@/lib/portfolio/settings-summary";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import {
  readCachedSettingsPortfolioSummary,
  refreshSettingsPortfolioSummaryCache,
} from "@/server/portfolio/settings-summary-cache";
import { enqueueSettingsPortfolioSummaryRefresh } from "@/server/portfolio/settings-summary-queue";
import { isNonProductionTestMode } from "@/server/auth/test-mode";
import { withAuth } from "@/server/security/with-auth";


export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("api.portfolio.settings-summary.GET", async () => {
    const { searchParams } = new URL(request.url);
    const requestedRange = searchParams.get("range");
    const requestedWalletScope = searchParams.get("walletScope");
    const range = isSettingsPortfolioRange(requestedRange) ? requestedRange : "month";
    const walletScope = isSettingsPortfolioWalletFilter(requestedWalletScope) ? requestedWalletScope : "all";
    const auth = await withAuth(request, { requireOrg: false, allowPublic: false });
    if (!auth.ok) {
      return auth.response;
    }

    if (!auth.session) {
      if (isNonProductionTestMode({ request })) {
        return apiResponse.success(createEmptySettingsPortfolioSummary(range));
      }
      return apiResponse.unauthorized();
    }

    const userId = auth.session.user.id;

    try {
      const cached = await readCachedSettingsPortfolioSummary({ userId, range, walletScope });
      if (cached) {
        if (cached.status === "stale") {
          await enqueueSettingsPortfolioSummaryRefresh({
            userId,
            range,
            walletScope,
            reason: "stale",
          });
        }

        return apiResponse.success(cached.summary);
      }

      const summary = await refreshSettingsPortfolioSummaryCache({
        userId,
        range,
        walletScope,
      });

      return apiResponse.success(summary);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to load wallet allocation data";

      return apiResponse.error("SETTINGS_PORTFOLIO_FAILED", message, 500);
    }
  });
}
