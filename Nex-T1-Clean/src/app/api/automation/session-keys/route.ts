import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  createUserAgentKey,
  listUserAgentKeys,
} from "@/server/automation/service";

export async function GET() {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      const keys = await listUserAgentKeys(supabase, userId);
      return cookieBridge.commit(apiResponse.success({ items: keys }));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("SESSION_KEY_LIST_ERROR", error instanceof Error ? error.message : "Failed to load session keys", 500),
      );
    }
  });
}

export async function POST(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
    const body = await request.json();
    const created = await createUserAgentKey(supabase, userId, body);
    return cookieBridge.commit(apiResponse.created(created));
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("SESSION_KEY_CREATE_ERROR", error instanceof Error ? error.message : "Failed to create session key", 400),
    );
  }
  });
}
