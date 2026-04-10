import { apiResponse } from '@/lib/api-platform';


import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { issueChallenge } from "@/server/wallets/passkeys/challenge-store";
import { createAuthenticationOptions, resolveRpConfigFromRequest } from "@/server/wallets/passkeys/webauthn";


export async function POST(request: Request) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;

  const session = auth.session;
  const userId = session!.user.id;

  const supabase = getSupabaseAdminClient();
  const { data: rows } = await supabase
    .from("wallet_passkeys")
    .select("credential_id")
    .eq("user_id", userId)
    .is("revoked_at", null);

  const allowCredentialIds = (rows ?? [])
    .map((r) => (typeof r?.credential_id === "string" ? r.credential_id : null))
    .filter((v: string | null): v is string => Boolean(v));

  const rp = resolveRpConfigFromRequest(request);
  const { options, challenge } = await createAuthenticationOptions({ rp, allowCredentialIds });
  const { token } = await issueChallenge({ userId, purpose: "auth", challenge });

  return apiResponse.success({ ok: true, options, challengeToken: token });
}
