import { connection, NextRequest } from "next/server";
import { z } from "zod";
import { encodeFunctionData, createPublicClient, http, type Address } from "viem";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { apiResponse } from "@/lib/api-platform";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { getSafeTargetChains } from "@/server/services/safe/chains";
import { resolveSocialRecoveryModuleAddress } from "@/server/services/safe/recovery";
import { createSafeTxRequestFromTransactions } from "@/server/services/safe/tx-requests";
import { emitWalletEvent } from "@/server/notifications/emit";
import { buildSafeActivationPayload } from "@/server/services/safe/activation";


const QuerySchema = z.object({
  chainId: z.coerce.number().int().positive(),
});

const BodySchema = z.object({
  chainId: z.number().int().positive(),
  guardians: z.array(z.string().min(1)).min(1),
  threshold: z.number().int().positive(),
});

const SAFE_MODULE_ABI = [
  {
    type: "function",
    name: "enableModule",
    stateMutability: "nonpayable",
    inputs: [{ name: "module", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isModuleEnabled",
    stateMutability: "view",
    inputs: [{ name: "module", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const RECOVERY_ABI = [
  {
    type: "function",
    name: "getGuardians",
    stateMutability: "view",
    inputs: [{ name: "_wallet", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getRecoveryRequest",
    stateMutability: "view",
    inputs: [{ name: "_wallet", type: "address" }],
    outputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "guardiansApprovalCount", type: "uint256" },
          { name: "newThreshold", type: "uint256" },
          { name: "executeAfter", type: "uint64" },
          { name: "newOwners", type: "address[]" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "addGuardianWithThreshold",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_guardian", type: "address" },
      { name: "_threshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeGuardianWithThreshold",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_prevGuardian", type: "address" },
      { name: "_guardian", type: "address" },
      { name: "_threshold", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "changeThreshold",
    stateMutability: "nonpayable",
    inputs: [{ name: "_threshold", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "invalidateNonce",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

const SENTINEL_GUARDIAN = "0x0000000000000000000000000000000000000001" as const;

function normalizeAddress(value: string): Address {
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/u.test(trimmed)) {
    throw new Error("invalid_address");
  }
  return trimmed as Address;
}

function computePrevGuardian(list: Address[], guardian: Address): Address | null {
  const idx = list.findIndex((g) => g.toLowerCase() === guardian.toLowerCase());
  if (idx < 0) return null;
  if (idx === 0) return SENTINEL_GUARDIAN;
  return list[idx - 1] ?? null;
}

export async function GET(req: NextRequest) {
  await connection();
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const query = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!query.success) {
    return apiResponse.badRequest("Invalid query parameters");
  }

  const chainId = query.data.chainId;
  const chains = getSafeTargetChains();
  const chain = chains.find((c) => c.chainId === chainId);
  if (!chain) return apiResponse.badRequest("Unsupported chain");

  const moduleAddress = resolveSocialRecoveryModuleAddress(chainId);
  if (!moduleAddress) return apiResponse.badRequest("Recovery module unavailable");

  const supabase = getSupabaseAdminClient();
  const { data: walletRow } = await supabase
    .from("wallet_accounts")
    .select("safe_address,status")
    .eq("user_id", auth.session.user.id)
    .eq("wallet_type", "safe")
    .eq("chain_id", chainId)
    .maybeSingle();

  const row = walletRow as { safe_address: string | null; status: string | null } | null;
  const safeAddress = row?.safe_address ?? null;
  const status = String(row?.status ?? "");

  const { data: config } = await supabase
    .from("wallet_recovery_config")
    .select("enabled,guardians,threshold,safe_address,updated_at")
    .eq("user_id", auth.session.user.id)
    .eq("chain_id", chainId)
    .maybeSingle();

  // Fetch active request from DB
  const { data: activeRequest } = await supabase
    .from("wallet_recovery_requests")
    .select("id,status,execute_after,new_owners")
    .eq("user_id", auth.session.user.id)
    .eq("chain_id", chainId)
    .eq("safe_address", safeAddress)
    .in("status", ["proposed", "pending_delay"])
    .maybeSingle();

  if (!safeAddress || status !== "ready") {
    return apiResponse.success({ ok: true, chainId, moduleAddress, safe: null, config: config ?? null, onchain: null, activeRequest: null });
  }

  const client = createPublicClient({ transport: http(chain.rpcUrl) });
  const [isEnabled, guardians, request] = await Promise.all([
    client.readContract({ address: safeAddress as Address, abi: SAFE_MODULE_ABI, functionName: "isModuleEnabled", args: [moduleAddress] }).catch(() => false),
    client.readContract({ address: moduleAddress, abi: RECOVERY_ABI, functionName: "getGuardians", args: [safeAddress as Address] }).catch(() => [] as Address[]),
    client.readContract({ address: moduleAddress, abi: RECOVERY_ABI, functionName: "getRecoveryRequest", args: [safeAddress as Address] }).catch(() => null),
  ]);

  return apiResponse.success({
    ok: true,
    chainId,
    moduleAddress,
    safe: { safeAddress, status },
    config: config ?? null,
    onchain: { enabled: Boolean(isEnabled), guardians, request },
    activeRequest: activeRequest ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const aal = requireAal2(auth.session);
  if (!aal.ok) return aal.response;

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiResponse.badRequest("Invalid request body");
  }

  const chainId = parsed.data.chainId;
  const guardiansDesired = parsed.data.guardians.map(normalizeAddress);
  const thresholdDesired = parsed.data.threshold;

  if (thresholdDesired > guardiansDesired.length) {
    return apiResponse.badRequest("Threshold cannot exceed guardian count");
  }

  const chains = getSafeTargetChains();
  const chain = chains.find((c) => c.chainId === chainId);
  if (!chain) return apiResponse.badRequest("Unsupported chain");

  const moduleAddress = resolveSocialRecoveryModuleAddress(chainId);
  if (!moduleAddress) return apiResponse.badRequest("Recovery module unavailable");

  const supabase = getSupabaseAdminClient();
  const { data: walletRow } = await supabase
    .from("wallet_accounts")
    .select("safe_address,status")
    .eq("user_id", auth.session.user.id)
    .eq("wallet_type", "safe")
    .eq("chain_id", chainId)
    .maybeSingle();

  const row = walletRow as { safe_address: string | null; status: string | null } | null;
  const safeAddress = row?.safe_address ?? null;
  const status = String(row?.status ?? "");
  if (!safeAddress || status !== "ready") {
    if (safeAddress) {
      const activation = await buildSafeActivationPayload({
        userId: auth.session.user.id,
        chainId,
        safeAddress,
      }).catch(() => null);
      if (activation?.status === "activation_required") {
        return apiResponse.error("safe_activation_required", "Safe activation required", 409, { activation: activation.activation });
      }
    }
    return apiResponse.badRequest("Safe not ready");
  }

  const client = createPublicClient({ transport: http(chain.rpcUrl) });
  const [isEnabled, guardiansCurrent, recoveryRequest] = await Promise.all([
    client.readContract({ address: safeAddress as Address, abi: SAFE_MODULE_ABI, functionName: "isModuleEnabled", args: [moduleAddress] }).catch(() => false),
    client.readContract({ address: moduleAddress, abi: RECOVERY_ABI, functionName: "getGuardians", args: [safeAddress as Address] }).catch(() => [] as Address[]),
    client.readContract({ address: moduleAddress, abi: RECOVERY_ABI, functionName: "getRecoveryRequest", args: [safeAddress as Address] }).catch(() => null),
  ]);

  const recoveryRecord = recoveryRequest as Record<string, UntypedJson> | null;
  const executeAfter = typeof recoveryRecord?.executeAfter === "bigint" ? Number(recoveryRecord.executeAfter) : 0;
  if (executeAfter > 0) {
    return apiResponse.badRequest("Recovery already in progress");
  }

  const desiredSet = new Set(guardiansDesired.map((g) => g.toLowerCase()));
  const currentSet = new Set(guardiansCurrent.map((g) => g.toLowerCase()));

  const toAdd = guardiansDesired.filter((g) => !currentSet.has(g.toLowerCase()));
  const toRemove = guardiansCurrent.filter((g) => !desiredSet.has(g.toLowerCase()));

  const txs: Array<{ to: string; value: string; data: string }> = [];

  if (!isEnabled) {
    txs.push({
      to: safeAddress,
      value: "0",
      data: encodeFunctionData({
        abi: SAFE_MODULE_ABI,
        functionName: "enableModule",
        args: [moduleAddress],
      }),
    });
  }

  // Add new guardians (keep threshold=1 during mutations; set final threshold at the end).
  for (const guardian of toAdd) {
    txs.push({
      to: moduleAddress,
      value: "0",
      data: encodeFunctionData({
        abi: RECOVERY_ABI,
        functionName: "addGuardianWithThreshold",
        args: [guardian, 1n],
      }),
    });
  }

  // Remove guardians, computing prev pointers against the in-flight list order.
  let working = guardiansCurrent.slice();
  for (const guardian of toRemove) {
    const prev = computePrevGuardian(working, guardian);
    if (!prev) {
      return apiResponse.badRequest("Guardian previous pointer unavailable");
    }
    txs.push({
      to: moduleAddress,
      value: "0",
      data: encodeFunctionData({
        abi: RECOVERY_ABI,
        functionName: "revokeGuardianWithThreshold",
        args: [prev, guardian, 1n],
      }),
    });
    // Update local list to match on-chain linked-list semantics (remove guardian).
    working = working.filter((g) => g.toLowerCase() !== guardian.toLowerCase());
  }

  txs.push({
    to: moduleAddress,
    value: "0",
    data: encodeFunctionData({
      abi: RECOVERY_ABI,
      functionName: "changeThreshold",
      args: [BigInt(thresholdDesired)],
    }),
  });

  // Invalidate nonce to prevent stale guardian confirmations after configuration changes.
  txs.push({
    to: moduleAddress,
    value: "0",
    data: encodeFunctionData({
      abi: RECOVERY_ABI,
      functionName: "invalidateNonce",
      args: [],
    }),
  });

  const txRequest = await createSafeTxRequestFromTransactions({
    userId: auth.session.user.id,
    chainId,
    safeAddress,
    transactions: txs,
    createdBy: "user",
    requiresMfa: true,
  });

  await supabase
    .from("wallet_recovery_config")
    .upsert(
      {
        user_id: auth.session.user.id,
        chain_id: chainId,
        safe_address: safeAddress,
        enabled: true,
        guardians: guardiansDesired,
        threshold: thresholdDesired,
      },
      { onConflict: "user_id,chain_id" },
    );

  await emitWalletEvent({
    user_id: auth.session.user.id,
    chain_id: chainId,
    safe_address: safeAddress,
    event_type: "recovery_config_updated",
    status: "info",
    title: "Recovery config update requested",
    body: "Guardian configuration requires your approval.",
    metadata: { requestId: txRequest.requestId, safeTxHash: txRequest.safeTxHash, moduleAddress },
  });

  await emitWalletEvent({
    user_id: auth.session.user.id,
    chain_id: chainId,
    safe_address: safeAddress,
    event_type: "safe_tx_approval_requested",
    status: "info",
    title: "Approval requested",
    body: "Recovery configuration requires your approval.",
    metadata: { requestId: txRequest.requestId, safeTxHash: txRequest.safeTxHash, safeAddress },
  });

  return apiResponse.success({ ok: true, txRequest });
}
