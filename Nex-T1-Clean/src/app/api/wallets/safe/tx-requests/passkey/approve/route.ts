import { NextRequest } from "next/server";
import { z } from "zod";
import { hexToBytes } from "viem";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import {
  getSafeTxRequestForUser,
  approveSafeTxRequestWithSenderSignature,
} from "@/server/services/safe/tx-requests";
import { resolveRpConfigFromRequest } from "@/server/wallets/passkeys/webauthn";
import { derivePasskeySignerAddress } from "@/server/services/safe/passkeys";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import { emitWalletEvent } from "@/server/notifications/emit";
import {
  buildPasskeySignatureBytesFromAssertion,
  wrapPasskeySignatureAsSafeContractSignature,
} from "@/server/wallets/passkeys/safe-signature";
import { apiResponse } from "@/lib/api-platform";
import { createPublicClient, http, type Address } from "viem";


const REQUIRE_AAL2 =
  process.env.PASSKEY_APPROVAL_REQUIRE_AAL2?.trim().toLowerCase() !==
  "false";

function isPasskeyTxApprovalEnabled(): boolean {
  return process.env.PASSKEY_TX_APPROVAL_ENABLED?.trim().toLowerCase() !== "false";
}

const BodySchema = z.object({
  requestId: z.string().uuid(),
  response: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === "object" && value !== null,
  ),
});

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(buf);
}

const SAFE_ABI = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

async function isOwner(params: {
  rpcUrl: string;
  safeAddress: Address;
  owner: Address;
}): Promise<boolean> {
  const client = createPublicClient({ transport: http(params.rpcUrl) });
  const owners = await client.readContract({
    address: params.safeAddress,
    abi: SAFE_ABI,
    functionName: "getOwners",
  });
  return owners
    .map((o) => o.toLowerCase())
    .includes(params.owner.toLowerCase());
}

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

  if (REQUIRE_AAL2) {
    const aal = requireAal2(auth.session);
    if (!aal.ok) return aal.response;
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.badRequest("Invalid body");
  }

  const row = await getSafeTxRequestForUser({
    userId: auth.session.user.id,
    requestId: parsed.data.requestId,
  });
  if (!row) {
    return apiResponse.notFound("Request not found");
  }
  if (row.status !== "proposed") {
    return apiResponse.badRequest(`Invalid status: ${row.status}`);
  }
  if (!row.safe_tx_hash) {
    return apiResponse.badRequest("Missing Safe Tx Hash");
  }

  const safeTxHashBytes = hexToBytes(row.safe_tx_hash as `0x${string}`);
  const expectedChallenge = toBase64Url(safeTxHashBytes);

  const response = parsed.data.response;
  const credentialId = String(response.id ?? "");
  if (!credentialId) {
    return apiResponse.badRequest("Missing credential ID");
  }

  const supabase = getSupabaseAdminClient();
  const { data: passkeyRows } = await supabase
    .from("wallet_passkeys")
    .select("id,credential_id,public_key_b64url,counter")
    .eq("user_id", auth.session.user.id)
    .eq("credential_id", credentialId)
    .is("revoked_at", null)
    .limit(1);

  const passkeyRow = passkeyRows?.[0];
  if (!passkeyRow) {
    return apiResponse.notFound("Unknown credential");
  }

  const rp = resolveRpConfigFromRequest(req);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
    credential: {
      id: passkeyRow.credential_id,
      publicKey: fromBase64Url(passkeyRow.public_key_b64url),
      counter: Number(passkeyRow.counter ?? 0),
    },
  });

  if (!verification.verified) {
    return apiResponse.unauthorized("Passkey auth failed");
  }

  const chain = getSafeTargetChains().find((c) => c.chainId === row.chain_id);
  if (!chain) {
    return apiResponse.badRequest("Unsupported chain");
  }

  let signerAddress: Address;
  try {
    const derived = await derivePasskeySignerAddress({
      chainId: chain.chainId,
      rpcUrl: chain.rpcUrl,
      publicKeyCose: fromBase64Url(passkeyRow.public_key_b64url),
    });
    signerAddress = derived.signerAddress;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      message === "passkey_module_unavailable"
        ? "passkey_module_unavailable"
        : "passkey_signer_unavailable";
    return apiResponse.badRequest(`${code}: ${message}`);
  }

  const safeAddress = row.safe_address as Address;
  const hasOwner = await isOwner({
    rpcUrl: chain.rpcUrl,
    safeAddress,
    owner: signerAddress,
  }).catch(() => false);
  if (!hasOwner) {
    return apiResponse.badRequest(
      "Passkey signer is not an owner on this Safe yet.",
    );
  }

  const passkeySignature = buildPasskeySignatureBytesFromAssertion({
    assertion: {
      id: credentialId,
      response: {
        authenticatorData: response.response.authenticatorData,
        clientDataJSON: response.response.clientDataJSON,
        signature: response.response.signature,
      },
    },
  });
  const safeSignature = wrapPasskeySignatureAsSafeContractSignature({
    signerAddress,
    passkeySignature,
  });

  const out = await approveSafeTxRequestWithSenderSignature({
    userId: auth.session.user.id,
    requestId: parsed.data.requestId,
    senderAddress: signerAddress,
    senderSignature: safeSignature,
  });

  const nextCounter = verification.authenticationInfo?.newCounter;
  const update: Record<string, UntypedJson> = {
    last_used_at: new Date().toISOString(),
  };
  if (
    typeof nextCounter === "number" &&
    Number.isFinite(nextCounter) &&
    nextCounter >= 0
  ) {
    update.counter = nextCounter;
  }
  await supabase.from("wallet_passkeys").update(update).eq("id", passkeyRow.id);

  await emitWalletEvent({
    user_id: auth.session.user.id,
    chain_id: row.chain_id,
    safe_address: row.safe_address,
    event_type: "passkey_used_for_approval",
    status: "success",
    title: "Passkey used for approval",
    body: "Passkey signature verified and submitted as a Safe contract signature.",
    metadata: {
      requestId: parsed.data.requestId,
      safeTxHash: out.safeTxHash,
      credentialId,
    },
  });

  await emitWalletEvent({
    user_id: auth.session.user.id,
    chain_id: row.chain_id,
    safe_address: row.safe_address,
    event_type: "safe_tx_approved",
    status: "success",
    title: "Safe transaction approved",
    body: "Passkey signature accepted and recorded.",
    metadata: { requestId: parsed.data.requestId, safeTxHash: out.safeTxHash },
  });

  return apiResponse.success({ ok: true, safeTxHash: out.safeTxHash });
}
