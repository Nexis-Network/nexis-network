import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  createGuardianCouncil,
  listGuardianCouncils,
} from "@/server/automation/service";

export async function GET() {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const councils = await listGuardianCouncils(supabase, userId);
      return cookieBridge.commit(apiResponse.success({ items: councils }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("COUNCIL_LIST_ERROR", error instanceof Error ? error.message : "Failed to load guardian councils", 500),
      );
    }
  });
}

export async function POST(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
    const body = await request.json();
    const created = await createGuardianCouncil(supabase, userId, body);
    return cookieBridge.commit(apiResponse.created(created));
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("COUNCIL_CREATE_ERROR", error instanceof Error ? error.message : "Failed to create guardian council", 400),
    );
  }
  });
}
