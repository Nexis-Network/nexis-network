import { apiResponse } from "@/lib/api-platform";
import { withAuth } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { issueChallenge } from "@/server/wallets/passkeys/challenge-store";
import {
  createAuthenticationOptions,
  resolveRpConfigFromRequest,
} from "@/server/wallets/passkeys/webauthn";
import {
  hashTransactionApprovalPayload,
  TransactionApprovalActionSchema,
  WalletSendPayloadSchema,
} from "@/server/security/transaction-approval-payload";
import { z } from "zod";


function isPasskeyTxApprovalEnabled(): boolean {
  return process.env.PASSKEY_TX_APPROVAL_ENABLED?.trim().toLowerCase() !== "false";
}

const BodySchema = z.object({
  action: TransactionApprovalActionSchema,
  payload: WalletSendPayloadSchema,
});

export async function POST(request: Request) {
  if (!isPasskeyTxApprovalEnabled()) {
    return apiResponse.error(
      "PASSKEY_TX_APPROVAL_DISABLED",
      "Passkey transaction approval is temporarily unavailable.",
      503,
    );
  }

  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
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
    .map((row) =>
      typeof row?.credential_id === "string" ? row.credential_id : null,
    )
    .filter((value: string | null): value is string => Boolean(value));

  if (!allowCredentialIds.length) {
    return apiResponse.badRequest("No passkeys found");
  }

  const rp = resolveRpConfigFromRequest(request);
  const { options, challenge } = await createAuthenticationOptions({
    rp,
    allowCredentialIds,
    userVerification: "required",
  });

  const payloadHash = hashTransactionApprovalPayload(
    parsed.data.action,
    parsed.data.payload,
  );
  const { token } = await issueChallenge({
    userId: auth.session.user.id,
    purpose: "step_up",
    challenge,
    scope: {
      action: parsed.data.action,
      payloadHash,
    },
  });

  return apiResponse.success({
    ok: true,
    options,
    challengeToken: token,
  });
}
