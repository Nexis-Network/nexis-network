import { NextRequest } from "next/server";
import { z } from "zod";
import { encodeFunctionData, createPublicClient, http, type Address } from "viem";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { apiResponse } from "@/lib/api-platform";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import { derivePasskeySignerAddress, resolveSafePasskeyDeployments } from "@/server/services/safe/passkeys";
import { createSafeTxRequestFromTransactions } from "@/server/services/safe/tx-requests";
import { emitWalletEvent } from "@/server/notifications/emit";
import { buildSafeActivationPayload } from "@/server/services/safe/activation";


const BodySchema = z.object({
  chainIds: z.array(z.number().int().positive()).optional(),
});

const SIGNER_FACTORY_ABI = [
  {
    type: "function",
    name: "createSigner",
    stateMutability: "nonpayable",
    inputs: [
      { name: "x", type: "uint256" },
      { name: "y", type: "uint256" },
      { name: "verifiers", type: "uint176" },
    ],
    outputs: [{ name: "signer", type: "address" }],
  },
] as const;

const SAFE_OWNER_ABI = [
  {
    type: "function",
    name: "addOwnerWithThreshold",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "threshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
] as const;

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const buf = Buffer.from(padded, "base64");
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();
  const session = auth.session;

  const aal = requireAal2(session);
  if (!aal.ok) return aal.response;

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  const chainIds = body.success ? body.data.chainIds : undefined;

  const supabase = getSupabaseAdminClient();

  // Pick the most recent active passkey.
  const { data: passkeys } = await supabase
    .from("wallet_passkeys")
    .select("credential_id,public_key_b64url")
    .eq("user_id", session.user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const passkey = passkeys?.[0] as { credential_id: string; public_key_b64url: string } | undefined;
  if (!passkey?.public_key_b64url) {
    return apiResponse.badRequest("No passkeys found");
  }

  // Discover all ready Safe wallets for the user.
  const { data: wallets } = await supabase
    .from("wallet_accounts")
    .select("chain_id,safe_address,status")
      .eq("user_id", session.user.id)
    .eq("wallet_type", "safe");

  type WalletRow = { chain_id: number; safe_address: string | null; status: string | null };
  const walletRows = (wallets ?? []) as WalletRow[];

  const candidates = walletRows
    .filter((w) => typeof w.chain_id === "number" && (typeof w.safe_address === "string" || w.safe_address == null))
    .filter((w) => !chainIds?.length || chainIds.includes(w.chain_id))
    .filter((w): w is WalletRow & { safe_address: string } => typeof w.safe_address === "string" && w.safe_address.startsWith("0x") && String(w.status) === "ready")
    .map((w) => ({ chainId: w.chain_id, safeAddress: w.safe_address as Address }));

  if (!candidates.length) {
    const pending = walletRows
      .filter((w) => typeof w.chain_id === "number" && (typeof w.safe_address === "string" || w.safe_address == null))
      .filter((w) => !chainIds?.length || chainIds.includes(w.chain_id))
      .filter((w): w is WalletRow & { safe_address: string } => typeof w.safe_address === "string" && w.safe_address.startsWith("0x") && String(w.status) !== "ready")
      .map((w) => ({ chainId: w.chain_id, safeAddress: w.safe_address as Address }));

    if (pending.length) {
      const activations = await Promise.all(
        pending.map(async (item) => {
          try {
            const activation = await buildSafeActivationPayload({
              userId: session.user.id,
              chainId: item.chainId,
              safeAddress: item.safeAddress,
            });
            return activation.status === "activation_required" ? activation.activation : null;
          } catch {
            return null;
          }
        }),
      );

      const activationPayloads = activations.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
      if (activationPayloads.length) {
        return apiResponse.success({ error: "safe_activation_required", activation: activationPayloads });
      }
    }
  }

  if (!candidates.length) {
    return apiResponse.badRequest("No ready Safe wallets found");
  }

  const chains = getSafeTargetChains();
  const created: Array<{ chainId: number; safeAddress: string; requestId: string; safeTxHash: string }> = [];
  const skipped: Array<{ chainId: number; safeAddress: string; reason: string }> = [];

  for (const item of candidates) {
    const chain = chains.find((c) => c.chainId === item.chainId);
    if (!chain) {
      skipped.push({ chainId: item.chainId, safeAddress: item.safeAddress, reason: "unsupported_chain" });
      continue;
    }

    const deployments = resolveSafePasskeyDeployments(chain.chainId);
    if (!deployments) {
      skipped.push({ chainId: item.chainId, safeAddress: item.safeAddress, reason: "passkey_module_unavailable" });
      continue;
    }

    const derived = await derivePasskeySignerAddress({
      chainId: chain.chainId,
      rpcUrl: chain.rpcUrl,
      publicKeyCose: fromBase64Url(passkey.public_key_b64url),
    });

    // If already an owner, skip creating an approval request.
    const client = createPublicClient({ transport: http(chain.rpcUrl) });
    const owners = await client.readContract({
      address: item.safeAddress,
      abi: SAFE_OWNER_ABI,
      functionName: "getOwners",
    });

    if (owners.map((o) => o.toLowerCase()).includes(derived.signerAddress.toLowerCase())) {
      skipped.push({ chainId: item.chainId, safeAddress: item.safeAddress, reason: "already_owner" });
      continue;
    }

    const txs = [
      {
        to: deployments.signerFactory,
        value: "0",
        data: encodeFunctionData({
          abi: SIGNER_FACTORY_ABI,
          functionName: "createSigner",
          args: [derived.x, derived.y, BigInt(derived.verifier)],
        }),
      },
      {
        to: item.safeAddress,
        value: "0",
        data: encodeFunctionData({
          abi: SAFE_OWNER_ABI,
          functionName: "addOwnerWithThreshold",
          args: [derived.signerAddress, 1n],
        }),
      },
    ];

    const txRequest = await createSafeTxRequestFromTransactions({
      userId: session.user.id,
      chainId: item.chainId,
      safeAddress: item.safeAddress,
      transactions: txs,
      createdBy: "user",
      requiresMfa: true,
    });

    created.push({ chainId: item.chainId, safeAddress: item.safeAddress, requestId: txRequest.requestId, safeTxHash: txRequest.safeTxHash });

    await emitWalletEvent({
      user_id: session.user.id,
      chain_id: item.chainId,
      safe_address: item.safeAddress,
      event_type: "safe_tx_approval_requested",
      status: "info",
      title: "Approval requested",
      body: "Enabling passkey approvals requires your approval.",
      metadata: {
        requestId: txRequest.requestId,
        safeTxHash: txRequest.safeTxHash,
        safeAddress: item.safeAddress,
        feature: "passkeys",
      },
    });
  }

  return apiResponse.success({ ok: true, created, skipped });
}
