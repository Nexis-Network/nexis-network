import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { withAuth } from "@/server/security/with-auth";
import { getSettingsOverviewUsageSummary } from "@/server/settings/overview-usage";

export async function GET(request: NextRequest) {
  await connection();

  return timeApiRoute("api.settings.overview.usage.GET", async () => {
    const auth = await withAuth(request, {
      requireOrg: false,
      allowPublic: false,
    });

    if (!auth.ok) {
      return auth.response;
    }

    if (!auth.session) {
      return apiResponse.unauthorized();
    }

    try {
      const payload = await getSettingsOverviewUsageSummary(auth.session.user.id);
      const response = apiResponse.success(payload);
      response.headers.set(
        "Cache-Control",
        "private, max-age=60, stale-while-revalidate=300",
      );
      return response;
    } catch (error) {
      return apiResponse.error(
        "SETTINGS_OVERVIEW_USAGE_FAILED",
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to load settings overview usage",
        500,
      );
    }
  });
}
