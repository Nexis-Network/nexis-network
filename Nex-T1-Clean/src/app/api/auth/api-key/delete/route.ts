import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";

type DeletePayload = {
  id?: UntypedJson;
  reason?: UntypedJson;
};

export async function POST(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    let body: DeletePayload;
    try {
      body = await request.json() as DeletePayload;
    } catch {
      return cookieBridge.commit(apiResponse.badRequest("Deletion payload must be valid JSON"));
    }
    const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : null;
    if (!id) {
      return cookieBridge.commit(apiResponse.badRequest("API key id is required"));
    }

    const reason =
      typeof body.reason === "string" && body.reason.trim().length > 0 ? body.reason.trim() : null;

    try {
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from("api_key")
        .update({
          revoked_at: nowIso,
          revoked_reason: reason,
          updated_at: nowIso,
        })
        .eq("id", id)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!updated) {
        return cookieBridge.commit(apiResponse.notFound("API key not found"));
      }

      await supabase
        .from("api_key_audit")
        .insert({
          api_key_id: id,
          event: "revoked",
          actor_supabase_uid: userId,
          context: reason ? { reason } : {},
        });

      return cookieBridge.commit(new Response(null, { status: 204 }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to revoke API key";
      return cookieBridge.commit(apiResponse.internalError(msg));
    }
  });
}
