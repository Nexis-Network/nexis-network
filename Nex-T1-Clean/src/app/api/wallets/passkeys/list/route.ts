import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";


export async function GET(request: Request) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("wallet_passkeys")
    .select("id,credential_id,created_at,last_used_at,revoked_at,transports")
    .eq("user_id", session!.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiResponse.internalError("list_failed");
  }

  return apiResponse.success({ ok: true, items: data ?? [] });
}
