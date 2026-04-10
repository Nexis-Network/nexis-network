import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  listDeveloperProjectsForConsole,
  type DeveloperConsoleSupabaseClient,
} from "@/server/services/developer-api/console-service";

export async function GET() {
  return withAuthedSupabase(async ({ cookieBridge, supabase }) => {
    const consoleSupabase = supabase as unknown as DeveloperConsoleSupabaseClient;
    const projects = await listDeveloperProjectsForConsole(consoleSupabase);
    return cookieBridge.commit(apiResponse.success(projects));
  });
}
