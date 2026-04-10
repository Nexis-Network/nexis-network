import { connection } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { withAuthedSupabase } from "@/server/api/helpers/with-auth-client";
import {
  deleteSolanaAgentKitAutomationTask,
  getSolanaAgentKitAutomationTask,
  upsertSolanaAgentKitAutomationTask,
} from "@/server/services/solana-agent-kit/repository";

const UpdateTaskSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    actionName: z.string().trim().min(1).max(120).optional(),
    domain: z.enum(["token", "nft", "defi", "misc", "blinks"]).optional(),
    intervalSeconds: z.coerce.number().int().min(60).max(60 * 60 * 24 * 30).optional(),
    walletAddress: z.string().trim().min(32).max(80).nullable().optional(),
    enabled: z.boolean().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

function computeNextRun(intervalSeconds: number): string {
  return new Date(Date.now() + intervalSeconds * 1000).toISOString();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  await connection();

  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    const { taskId } = await params;
    const existing = await getSolanaAgentKitAutomationTask(userId, taskId);

    if (!existing) {
      return cookieBridge.commit(apiResponse.notFound("Solana AgentKit task not found."));
    }

    const raw = await request.json().catch(() => null);
    const parsed = UpdateTaskSchema.safeParse(raw);

    if (!parsed.success) {
      return cookieBridge.commit(apiResponse.validationError(parsed.error));
    }

    const nextEnabled = parsed.data.enabled ?? existing.enabled;
    const nextInterval = parsed.data.intervalSeconds ?? existing.interval_seconds;
    const nextRunAt =
      typeof parsed.data.enabled === "boolean"
        ? parsed.data.enabled
          ? computeNextRun(nextInterval)
          : null
        : typeof parsed.data.intervalSeconds === "number" && nextEnabled
          ? computeNextRun(nextInterval)
          : existing.next_run_at;

    await upsertSolanaAgentKitAutomationTask({
      id: existing.id,
      user_id: existing.user_id,
      wallet_address:
        parsed.data.walletAddress === undefined
          ? existing.wallet_address
          : parsed.data.walletAddress,
      name: parsed.data.name ?? existing.name,
      action_name: parsed.data.actionName ?? existing.action_name,
      domain: parsed.data.domain ?? existing.domain,
      interval_seconds: nextInterval,
      enabled: nextEnabled,
      parameters: parsed.data.parameters ?? existing.parameters,
      last_run_at: existing.last_run_at,
      next_run_at: nextRunAt,
      last_error: parsed.data.enabled === false ? null : existing.last_error,
    });

    return cookieBridge.commit(apiResponse.success({ ok: true }));
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  await connection();

  return withAuthedSupabase(async ({ userId, cookieBridge }) => {
    const { taskId } = await params;
    const existing = await getSolanaAgentKitAutomationTask(userId, taskId);

    if (!existing) {
      return cookieBridge.commit(apiResponse.notFound("Solana AgentKit task not found."));
    }

    await deleteSolanaAgentKitAutomationTask(userId, taskId);
    return cookieBridge.commit(apiResponse.success({ ok: true }));
  });
}
