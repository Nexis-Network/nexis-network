import { NextRequest } from "next/server";
import { z } from "zod";
import { hexToBytes } from "viem";

import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { apiResponse } from "@/lib/api-platform";
import { getSafeTxRequestForUser } from "@/server/services/safe/tx-requests";
import { createAuthenticationOptions, resolveRpConfigFromRequest } from "@/server/wallets/passkeys/webauthn";


function isPasskeyTxApprovalEnabled(): boolean {
  return process.env.PASSKEY_TX_APPROVAL_ENABLED?.trim().toLowerCase() !== "false";
}

const BodySchema = z.object({
  requestId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  if (!isPasskeyTxApprovalEnabled()) {
    return apiResponse.error(
      "PASSKEY_TX_APPROVAL_DISABLED",
      "Passkey transaction approval is temporarily unavailable.",
      503,
    );
  }

  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.badRequest("Invalid body");
  }

  const row = await getSafeTxRequestForUser({ userId: auth.session.user.id, requestId: parsed.data.requestId });
  if (!row) {
    return apiResponse.notFound("Request not found");
  }
  if (!row.safe_tx_hash) {
    return apiResponse.badRequest("Missing Safe Tx Hash");
  }

  const supabase = getSupabaseAdminClient();
  const { data: passkeys, error } = await supabase
    .from("wallet_passkeys")
    .select("credential_id")
    .eq("user_id", auth.session.user.id)
    .is("revoked_at", null);

  if (error) {
    return apiResponse.internalError("Passkey lookup failed");
  }

  const allowCredentialIds = (passkeys ?? [])
    .map((r) => (typeof r?.credential_id === "string" ? r.credential_id : null))
    .filter((v: string | null): v is string => Boolean(v));

  if (!allowCredentialIds.length) {
    return apiResponse.badRequest("No passkeys found");
  }

  const rp = resolveRpConfigFromRequest(req);
  const safeTxHashBytes = hexToBytes(row.safe_tx_hash as `0x${string}`);

  const { options } = await createAuthenticationOptions({
    rp,
    allowCredentialIds,
    challenge: safeTxHashBytes,
    userVerification: "required",
  });

  return apiResponse.success({ ok: true, options });
}
