import { NextRequest } from "next/server";
import { z } from "zod";
import { encodeFunctionData } from "viem";

import { withAuth } from "@/server/security/with-auth";
import { requireAal2 } from "@/server/security/mfa-assurance";
import { apiResponse } from "@/lib/api-platform";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { resolveSafeDeployments } from "@/server/services/safe/deployments";
import { createSafeTxRequestFromTransactions } from "@/server/services/safe/tx-requests";
import { emitWalletEvent } from "@/server/notifications/emit";
import { assertUserOwnsSafeWallet } from "@/server/services/safe/ownership";
import { buildSafeActivationPayload } from "@/server/services/safe/activation";


const AllowanceEntrySchema = z.object({
  token: z.string().min(1),
  maxAmountWei: z.string().regex(/^\d+$/u),
  resetTimeMin: z.number().int().positive().default(1440),
  resetBaseMin: z.number().int().nonnegative().default(0),
});

const BodySchema = z.object({
  chainId: z.number().int().positive(),
  safeAddress: z.string().min(1),
  allowances: z.array(AllowanceEntrySchema).min(1),
});

import { ALLOWANCE_MODULE_ABI } from "@/modules/wallets/nex/modules/allowance";

export async function PUT(req: NextRequest) {
  const auth = await withAuth(req, { allowPublic: false, requireOrg: true });
  if (!auth.ok) return auth.response;
  if (!auth.session) return apiResponse.unauthorized();

  const aal = requireAal2(auth.session);
  if (!aal.ok) return aal.response;

  try {
    const body = BodySchema.parse(await req.json());

    const supabase = getSupabaseAdminClient();
    const activation = await buildSafeActivationPayload({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
    });
    if (activation.status === "activation_required") {
      return apiResponse.success({
        error: "safe_activation_required",
        activation: activation.activation,
      });
    }

    await assertUserOwnsSafeWallet({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
      requireReady: true,
    });

    // Persist policy (DB) - authoritative configuration.
    const policyPayload = {
      allowances: body.allowances.map((entry) => ({
        token: entry.token,
        maxAmountWei: entry.maxAmountWei,
        resetTimeMin: entry.resetTimeMin,
        resetBaseMin: entry.resetBaseMin,
      })),
    };

    const upsert = await supabase.from("agent_policies").upsert(
      {
        user_id: auth.session.user.id,
        chain_id: body.chainId,
        safe_address: body.safeAddress,
        enabled: true,
        reset_interval_seconds: Math.max(
          ...body.allowances.map((a) => a.resetTimeMin * 60),
        ),
        policy: policyPayload,
      },
      { onConflict: "user_id,chain_id" },
    );

    if (upsert.error) {
      return apiResponse.internalError(upsert.error.message);
    }

    // Create an on-chain configuration tx (Safe owner must approve+execute).
    const deployments = resolveSafeDeployments(body.chainId);
    const allowanceModule = deployments.allowanceModule;
    if (!allowanceModule) {
      return apiResponse.badRequest("Allowance module unavailable");
    }

    const { data: signerRows } = await supabase
      .from("wallet_signers")
      .select("address")
      .eq("user_id", auth.session.user.id)
      .eq("signer_kind", "allowance_delegate")
      .limit(1);

    const delegateAddress =
      (signerRows?.[0]?.address as string | undefined)?.trim() ?? "";
    if (!delegateAddress) {
      return apiResponse.badRequest("Missing allowance delegate");
    }

    const txs = [
      {
        to: allowanceModule,
        value: "0",
        data: encodeFunctionData({
          abi: ALLOWANCE_MODULE_ABI,
          functionName: "addDelegate",
          args: [delegateAddress as `0x${string}`],
        }),
      },
      ...body.allowances.map((entry) => ({
        to: allowanceModule,
        value: "0",
        data: encodeFunctionData({
          abi: ALLOWANCE_MODULE_ABI,
          functionName: "setAllowance",
          args: [
            delegateAddress as `0x${string}`,
            entry.token as `0x${string}`,
            BigInt(entry.maxAmountWei),
            entry.resetTimeMin,
            entry.resetBaseMin,
          ],
        }),
      })),
    ];

    const txRequest = await createSafeTxRequestFromTransactions({
      userId: auth.session.user.id,
      chainId: body.chainId,
      safeAddress: body.safeAddress,
      transactions: txs,
      createdBy: "user",
      requiresMfa: true,
    });

    // Emit approval requested for on-chain allowance config tx.
    await emitWalletEvent({
      user_id: auth.session.user.id,
      chain_id: body.chainId,
      safe_address: body.safeAddress,
      event_type: "safe_tx_approval_requested",
      status: "info",
      title: "Approval requested",
      body: "Allowance policy update requires your approval.",
      metadata: {
        requestId: txRequest.requestId,
        safeTxHash: txRequest.safeTxHash,
        safeAddress: body.safeAddress,
      },
    });

    return apiResponse.success({
      ok: true,
      policy: policyPayload,
      txRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update allowance policy";
    return apiResponse.internalError(message);
  }
}
