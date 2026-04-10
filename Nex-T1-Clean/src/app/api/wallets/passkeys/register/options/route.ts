import { apiResponse } from '@/lib/api-platform';

import { z } from "zod";

import { withAuth } from "@/server/security/with-auth";

import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { issueChallenge } from "@/server/wallets/passkeys/challenge-store";
import { createRegistrationOptions, resolveRpConfigFromRequest } from "@/server/wallets/passkeys/webauthn";


import { logger } from '@/lib/logger';

const BodySchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;

  const { session } = auth;

  try {
    const body = BodySchema.safeParse(await request.json().catch(() => null));
    const email = body.success ? body.data.email : undefined;

    const rp = resolveRpConfigFromRequest(request);
    const supabase = getSupabaseAdminClient();

    const userId = session?.user?.id ?? "00000000-0000-0000-0000-000000000000";
    if (userId === "00000000-0000-0000-0000-000000000000") {
      return apiResponse.error("dev_auth_bypass_enabled", "Developer auth bypass enabled", 409);
    }

    const { data: rows, error: dbError } = await supabase
      .from("wallet_passkeys")
      .select("credential_id")
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (dbError) {
      logger.error("[Passkey Options] DB error:", dbError);
      throw new Error(`DB Error: ${dbError.message}`);
    }

    const excludeCredentialIds = (rows ?? [])
      .map((r) => (typeof r?.credential_id === "string" ? r.credential_id : null))
      .filter((v: string | null): v is string => Boolean(v));

    const { options, challenge } = await createRegistrationOptions({
      rp,
      userId,
      userName: email ?? session!.user.email ?? userId,
      userDisplayName: email ?? session!.user.email ?? "Nex-T1 user",
      excludeCredentialIds,
    });

    const { token } = await issueChallenge({ userId, purpose: "register", challenge });

    return apiResponse.success({ ok: true, options, challengeToken: token });
  } catch (error: UntypedJson) {
    logger.error("[Passkey Options] Unhandled error:", error instanceof Error ? error.message : String(error));
    return apiResponse.internalError(error instanceof Error ? error.message : "internal_server_error");
  }
}
