import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import type { SolanaAgentKitDomain } from "@/server/services/solana-agent-kit/catalog";
import { upsertSolanaAgentKitAutomationTask } from "@/server/services/solana-agent-kit/repository";
import { resolveDefaultUserSolanaWalletAddress } from "@/server/services/solana-agent-kit/wallet-selection";

const DOMAIN_VALUES = ["token", "nft", "defi", "misc", "blinks"] as const;

const CreateTaskSchema = z.object({
  name: z.string().trim().min(1).max(80),
  actionName: z.string().trim().min(1).max(120),
  domain: z.enum(DOMAIN_VALUES),
  intervalSeconds: z.coerce.number().int().min(60).max(60 * 60 * 24 * 30),
  walletAddress: z.string().trim().min(32).max(80).optional().nullable(),
  enabled: z.boolean().optional().default(true),
  parameters: z.record(z.string(), z.unknown()).optional().default({}),
});

function computeNextRun(intervalSeconds: number): string {
  return new Date(Date.now() + intervalSeconds * 1000).toISOString();
}

export async function POST(request: Request) {
  await connection();

  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    const raw = await request.json().catch(() => null);
    const parsed = CreateTaskSchema.safeParse(raw);

    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.validationError(parsed.error));
    }

    const walletAddress =
      parsed.data.walletAddress?.trim() ||
      (await resolveDefaultUserSolanaWalletAddress(userId));

    await upsertSolanaAgentKitAutomationTask({
      user_id: userId,
      wallet_address: walletAddress,
      name: parsed.data.name,
      action_name: parsed.data.actionName,
      domain: parsed.data.domain satisfies SolanaAgentKitDomain,
      interval_seconds: parsed.data.intervalSeconds,
      enabled: parsed.data.enabled,
      parameters: parsed.data.parameters,
      next_run_at: parsed.data.enabled ? computeNextRun(parsed.data.intervalSeconds) : null,
      last_error: null,
    });

    return cookieBridge.commit(
      apiResponse.created({
        ok: true,
        walletAddress,
      }),
    );
  });
}
