import { type NextRequest } from "next/server";

import { apiResponse, validateQuery } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  getDeveloperConsoleBilling,
  type DeveloperConsoleSupabaseClient,
} from "@/server/services/developer-api/console-service";

import { developerApiBillingQuerySchema } from "@/app/api/auth/developer-api/billing/route.schema";

export async function GET(request: NextRequest) {
  const query = validateQuery(request, developerApiBillingQuerySchema);
  if (!query.success) {
    return query.response;
  }

  return withAuthedSupabase(async ({ cookieBridge, supabase }) => {
    const consoleSupabase = supabase as unknown as DeveloperConsoleSupabaseClient;
    const billing = await getDeveloperConsoleBilling(
      consoleSupabase,
      query.data.projectId,
    );
    return cookieBridge.commit(apiResponse.success(billing));
  });
}
