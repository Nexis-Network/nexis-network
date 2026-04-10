export const maxDuration = 60;

import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import {
  handleRequestRateLimit,
  createRateLimitResponse,
} from "@/lib/request-utils";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import { transferAgentOwnership } from "@/server/services/cdp/agent-provision";

const ParamsSchema = z.object({
  id: z.string().uuid("Invalid agent ID"),
});

const TransferBodySchema = z.object({
  toUserId: z.string().uuid("Invalid target user ID"),
});

/**
 * POST /api/agents/[id]/transfer
 *
 * Transfer agent ownership to another user. This orchestrates:
 * 1. Ownership verification (current owner only)
 * 2. Active wallet detachment (previous generation)
 * 3. Agent owner update in the database
 * 4. New Nex Wallet provisioning for the new owner
 *
 * This is a destructive operation: the previous owner loses access to the
 * agent's wallets and positions. A new generation of wallets is provisioned
 * for the new owner.
 *
 * Body: { toUserId: string }
 *
 * Auth required: current owner only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return timeApiRoute("agents.transfer.POST", async () => {
    try {
      // Rate limit — ownership transfers are sensitive
      const rateLimitResult = await handleRequestRateLimit(
        request,
        "agent-transfer",
      );
      if (!rateLimitResult.success) {
        return createRateLimitResponse(rateLimitResult.errorResponse);
      }

      const { id } = await params;

      const paramsParsed = ParamsSchema.safeParse({ id });
      if (!paramsParsed.success) {
        return apiResponse.validationError(paramsParsed.error);
      }

      // Auth
      const { context } = await resolveSupabaseContext(undefined, { request });
      if (!context) {
        return apiResponse.unauthorized("Valid session required");
      }

      // Agent ownership check
      const supabase = getSupabaseAdminClient();
      const { data: agent, error: agentError } = await supabase
        .from("agent")
        .select("id,owner_user_id,org_id")
        .eq("id", id)
        .single();

      if (agentError || !agent) {
        return apiResponse.notFound("Agent not found");
      }

      if (agent.owner_user_id !== context.userId) {
        return apiResponse.forbidden(
          "Only the current owner can transfer agent ownership",
        );
      }

      // Parse and validate body
      const raw = await request.json().catch(() => ({}));
      const bodyParsed = TransferBodySchema.safeParse(raw);
      if (!bodyParsed.success) {
        return apiResponse.validationError(bodyParsed.error);
      }

      const { toUserId } = bodyParsed.data;

      // Prevent transferring to self
      if (toUserId === context.userId) {
        return apiResponse.badRequest(
          "Cannot transfer agent ownership to yourself",
          "SELF_TRANSFER",
        );
      }

      // Verify target user exists
      const { data: targetUser, error: targetError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", toUserId)
        .single();

      if (targetError || !targetUser) {
        return apiResponse.badRequest(
          "Target user not found",
          "TARGET_USER_NOT_FOUND",
        );
      }

      // --- Org boundary enforcement ---
      // When the agent belongs to an org, the target must be in that org.
      // When the agent has NO org, the sender and target must share at least
      // one org -- unless neither user belongs to any org (personal transfer).
      let hasSharedOrg = false;

      if (agent.org_id) {
        const { data: targetMembership } = await supabase
          .from("org_member")
          .select("user_id")
          .eq("org_id", agent.org_id)
          .eq("user_id", toUserId)
          .maybeSingle();

        if (!targetMembership) {
          return apiResponse.badRequest(
            "Target user must be a member of the same organization",
            "CROSS_ORG_TRANSFER",
          );
        }

        hasSharedOrg = true;
      } else {
        // Agent has no org -- check whether sender and target share one.
        const { data: senderOrgs } = await supabase
          .from("org_member")
          .select("org_id")
          .eq("user_id", context.userId);

        const senderOrgIds = (senderOrgs ?? []).map(
          (r: { org_id: string }) => r.org_id,
        );

        if (senderOrgIds.length > 0) {
          const { data: sharedOrgs } = await supabase
            .from("org_member")
            .select("org_id")
            .eq("user_id", toUserId)
            .in("org_id", senderOrgIds)
            .limit(1);

          if (!sharedOrgs || sharedOrgs.length === 0) {
            return apiResponse.badRequest(
              "Target user must share an organization with you",
              "NO_SHARED_ORG",
            );
          }

          hasSharedOrg = true;
        }
        // If sender has no orgs either, this is a personal-to-personal
        // transfer (marketplace scenario) which is still allowed.
      }

      // Audit log: capture org context for every transfer attempt
      logger.info("agent_transfer_org_context", {
        agentId: id,
        agentOrgId: agent.org_id ?? "personal",
        senderUserId: context.userId,
        targetUserId: toUserId,
        hasSharedOrg,
      });

      // Execute the transfer
      const result = await transferAgentOwnership({
        agentId: id,
        fromUserId: context.userId,
        toUserId,
        orgId: agent.org_id as string | null,
      });

      logger.info("agent_transfer_completed", {
        agentId: id,
        fromUserId: context.userId,
        toUserId,
        previousGeneration: result.previousGeneration,
        newGeneration: result.newGeneration,
        detachedWallets: result.detachedWallets.length,
      });

      return apiResponse.success({
        agentId: result.agentId,
        fromUserId: result.fromUserId,
        toUserId: result.toUserId,
        previousGeneration: result.previousGeneration,
        newGeneration: result.newGeneration,
        newWallets: {
          evmSmartAccountAddress:
            result.newProvision.evmSmartAccountAddress,
          solanaAddress: result.newProvision.solanaAddress,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      // Surface specific transfer errors as client-facing messages
      if (message.includes("Ownership verification failed")) {
        return apiResponse.forbidden(
          "Ownership verification failed. You are not the current owner.",
        );
      }

      if (message.includes("CRITICAL: Manual remediation required")) {
        logger.error("agents_transfer_critical_rollback_failure", {
          error: message,
        });
        return apiResponse.error(
          "TRANSFER_CRITICAL_FAILURE",
          "Transfer failed in an unrecoverable state. Our team has been notified and will resolve this shortly.",
          500,
        );
      }

      if (message.includes("wallet provisioning failed")) {
        logger.error("agents_transfer_provision_rolled_back", {
          error: message,
        });
        return apiResponse.error(
          "TRANSFER_PROVISION_FAILED",
          "Agent transfer was rolled back because wallet provisioning failed. No changes were made. Please try again.",
          500,
        );
      }

      logger.error("agents_transfer_failed", { error: message });
      return apiResponse.internalError(
        "Failed to transfer agent ownership",
      );
    }
  });
}
