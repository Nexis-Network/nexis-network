import { apiResponse } from "@/lib/api-platform";
import { nexFetch } from "@/server/api/nex-client";
import { withAuth } from "@/server/security/with-auth";
import {
  getTransactionApprovalPreference,
} from "@/server/security/transaction-approval-preferences";
import {
  verifyStepUpToken,
} from "@/server/security/step-up-token";
import {
  WalletSendPayloadSchema,
} from "@/server/security/transaction-approval-payload";


function isPasskeyTxApprovalEnabled(): boolean {
  return process.env.PASSKEY_TX_APPROVAL_ENABLED?.trim().toLowerCase() !== "false";
}

export async function POST(request: Request) {
  const auth = await withAuth(request, { allowPublic: false, requireOrg: false });
  if (!auth.ok) return auth.response;
  if (!auth.session?.accessToken) return apiResponse.unauthorized("Sign in required");

  const parsed = WalletSendPayloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  const preference = await getTransactionApprovalPreference(auth.session.user.id);
  if (preference.enabled && preference.method === "passkey") {
    if (!isPasskeyTxApprovalEnabled()) {
      return apiResponse.error(
        "PASSKEY_TX_APPROVAL_DISABLED",
        "Passkey transaction approval is temporarily unavailable.",
        503,
      );
    }

    const verified = await verifyStepUpToken({
      token: request.headers.get("x-step-up-token"),
      userId: auth.session.user.id,
      action: "wallets:send",
      payload: parsed.data,
    });

    if (!verified) {
      return apiResponse.error(
        "STEP_UP_REQUIRED",
        "Passkey approval is required before this transaction can be submitted.",
        428,
      );
    }
  }

  try {
    const upstream = await nexFetch("/api/v1/wallets/send", {
      method: "POST",
      bearer: auth.session.accessToken,
      body: parsed.data,
      headers: {
        "Content-Type": "application/json",
      },
      timeoutMs: 15000,
    });

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return apiResponse.error(
      "WALLET_SEND_PROXY_ERROR",
      error instanceof Error ? error.message : "Wallet send failed",
      502,
    );
  }
}
