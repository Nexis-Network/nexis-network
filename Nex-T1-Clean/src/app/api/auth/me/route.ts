import { type NextRequest } from "next/server";
import { withAuth } from "@/server/security/with-auth";
import { getCreditBalance } from "@/server/services/credits/credit-service";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";


export async function GET(request: NextRequest) {
  return timeApiRoute("auth.me.GET", async () => {
    const auth = await withAuth(request);
    if (!auth.ok) {
      return auth.response;
    }
    if (!auth.session) {
      return apiResponse.unauthorized();
    }

    // Fetch optional extra data (credits, specialized profile info)
    const credits = await getCreditBalance(auth.session.user.id);

    return apiResponse.success({
      user: {
        id: auth.session.user.id,
        email: auth.session.user.email,
        roles: (auth.session.user.app_metadata)?.roles || [],
      },
      credits: {
        balance: credits.remaining,
        plan: credits.plan,
      },
      isAuthenticated: true,
    });
  });
}
