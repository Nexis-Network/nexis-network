import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  generateApiKeySecret,
  hashApiKeySecret,
  mapApiKeyRecord,
  type ApiKeyRecord,
} from "@/server/security/api-key-utils";

type RotatePayload = {
  id?: UntypedJson;
};

export async function POST(request: Request) {
  return withAuthedSupabase(async ({ cookieBridge, supabase, userId }) => {
    let body: RotatePayload;
    try {
      body = await request.json() as RotatePayload;
    } catch {
      return cookieBridge.commit(apiResponse.badRequest("Rotation payload must be valid JSON"));
    }
    const id = typeof body.id === "string" && body.id.trim().length > 0 ? body.id.trim() : null;
    if (!id) {
      return cookieBridge.commit(apiResponse.badRequest("API key id is required"));
    }

    try {
      const { data: existing, error: fetchError } = await supabase
        .from("api_key")
        .select(
          "id,name,start,prefix,owner_type,owner_id,created_at,updated_at,expires_at,metadata,revoked_at,tier,rate_limit_requests,rate_limit_window_seconds,daily_quota,monthly_quota,project_id,last_used_at,allowed_products",
        )
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!existing) {
        return cookieBridge.commit(apiResponse.notFound("API key not found"));
      }

      if (existing.revoked_at) {
        return cookieBridge.commit(apiResponse.badRequest("Cannot rotate a revoked API key"));
      }

      const secret = generateApiKeySecret();
      const hashedSecret = hashApiKeySecret(secret);
      const start = secret.slice(0, 6);
      const prefix = secret.slice(0, 4);
      const nowIso = new Date().toISOString();

      const { data: updated, error: updateError } = await supabase
        .from("api_key")
        .update({
          hashed_secret: hashedSecret,
          start,
          prefix,
          updated_at: nowIso,
          revoked_at: null,
          revoked_reason: null,
        })
        .eq("id", id)
        .is("revoked_at", null)
        .select(
          "id,name,start,prefix,owner_type,owner_id,created_at,updated_at,expires_at,metadata,revoked_at,tier,rate_limit_requests,rate_limit_window_seconds,daily_quota,monthly_quota,project_id,last_used_at,allowed_products",
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      await supabase
        .from("api_key_audit")
        .insert({
          api_key_id: id,
          event: "rotated",
          actor_supabase_uid: userId,
        });

      const mapped = mapApiKeyRecord(updated as ApiKeyRecord);
      return cookieBridge.commit(
        apiResponse.success({
          ...mapped,
          key: secret,
        }),
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to rotate API key";
      return cookieBridge.commit(apiResponse.internalError(msg));
    }
  });
}
