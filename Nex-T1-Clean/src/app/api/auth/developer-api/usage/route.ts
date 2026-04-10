import { type NextRequest } from "next/server";

import { apiResponse, validateQuery } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  getDeveloperConsoleUsage,
  type DeveloperConsoleSupabaseClient,
} from "@/server/services/developer-api/console-service";

import { developerApiUsageQuerySchema } from "@/app/api/auth/developer-api/usage/route.schema";

export async function GET(request: NextRequest) {
  const query = validateQuery(request, developerApiUsageQuerySchema);
  if (!query.success) {
    return query.response;
  }

  return withAuthedSupabase(async ({ cookieBridge, supabase }) => {
    const consoleSupabase = supabase as unknown as DeveloperConsoleSupabaseClient;
    const usage = await getDeveloperConsoleUsage(
      consoleSupabase,
      query.data.projectId,
    );
    return cookieBridge.commit(apiResponse.success(usage));
  });
}
