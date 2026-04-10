import { type NextRequest } from "next/server";

import { apiResponse, validateQuery } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  listDeveloperConsoleRequestLogs,
  type DeveloperConsoleSupabaseClient,
} from "@/server/services/developer-api/console-service";

import { developerApiRequestLogsQuerySchema } from "@/app/api/auth/developer-api/request-logs/route.schema";

export async function GET(request: NextRequest) {
  const query = validateQuery(request, developerApiRequestLogsQuerySchema);
  if (!query.success) {
    return query.response;
  }

  return withAuthedSupabase(async ({ cookieBridge, supabase }) => {
    const consoleSupabase = supabase as unknown as DeveloperConsoleSupabaseClient;
    const logs = await listDeveloperConsoleRequestLogs(consoleSupabase, {
      projectId: query.data.projectId,
      limit: query.data.limit,
    });
    return cookieBridge.commit(apiResponse.success(logs));
  });
}
