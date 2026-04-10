import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import { revokeUserAgentKey } from "@/server/automation/service";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;

  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    try {
      let payload: UntypedJson = undefined;
      if (request.headers.get("content-length")) {
        try {
          payload = await request.json();
        } catch {
          /* ignore malformed body; schema will validate */
        }
      }

      const revoked = await revokeUserAgentKey(supabase, userId, params.id, payload ?? {});
      return cookieBridge.commit(apiResponse.success(revoked));
    } catch (error) {
      return cookieBridge.commit(
        apiResponse.error("SESSION_KEY_REVOKE_ERROR", error instanceof Error ? error.message : "Failed to revoke session key", 400),
      );
    }
  });
}
