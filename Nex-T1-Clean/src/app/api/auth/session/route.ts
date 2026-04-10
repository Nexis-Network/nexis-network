import { cookies } from "next/headers";
import { connection, type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { timeApiRoute } from "@/server/instrumentation/metrics";

export async function GET(_request: NextRequest) {
  await connection();
  return timeApiRoute("auth.session.GET", async () => {
    const jar = await cookies();
    const cookieBridge = createCookieBridge(jar);
    const { context } = await resolveSupabaseContext(cookieBridge);

    if (!context) {
      const response = apiResponse.success({ session: null, user: null });
      return cookieBridge.commit(response);
    }

    const response = apiResponse.success({
      session: context.session,
      user: context.session.user,
      metadata: context.session.metadata,
    });

    return cookieBridge.commit(response);
  });
}
