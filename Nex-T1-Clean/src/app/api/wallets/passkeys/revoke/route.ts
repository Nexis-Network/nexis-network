import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { emitWalletEvent } from "@/server/notifications/emit";


const BodySchema = z.object({
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const aal = requireAal2(session);
  if (!aal.ok) return aal.response;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.badRequest("invalid_body");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("wallet_passkeys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", session!.user.id);

  if (error) {
    return apiResponse.internalError("revoke_failed");
  }

  await emitWalletEvent({
    user_id: session!.user.id,
    event_type: "passkey_revoked",
    status: "success",
    title: "Passkey revoked",
    body: "A wallet passkey was revoked.",
    metadata: { id: parsed.data.id },
  });

  return apiResponse.success({ ok: true });
}
