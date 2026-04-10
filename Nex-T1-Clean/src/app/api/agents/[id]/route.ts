export const maxDuration = 15;

import { connection, NextRequest } from "next/server";
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/request-utils';
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { canManageAgent } from '@/server/agents/access';
import { logger } from '@/lib/logger';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const AvatarUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value.startsWith("orb:")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "avatarUrl must be an http(s) URL or an orb: preset.");

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
  systemPrompt: z.string().nullable().optional(),
  avatarUrl: AvatarUrlSchema.nullable().optional(),
}).passthrough();

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const { id: agentId } = await context.params;
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: true, requireMembership: false });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    const service = access.service;
    const correlationId = access.correlationId;
    const shouldRedactConfig = access.shouldRedactConfig;
    const canManage = access.canManage;

    const { data: agent, error } = await service
      .from('agent')
      .select('id, org_id, owner_user_id, slug, name, description, system_prompt, avatar_url, supply, num_owners, visibility, created_at, updated_at')
      .eq('id', agentId)
      .maybeSingle();

    if (error) {
      return createErrorResponse(new Error(error.message), { status: 404, customMessage: 'agent not found', headers: { 'X-Correlation-Id': correlationId } });
    }
    if (!agent) {
      return createErrorResponse(new Error('Agent not found'), { status: 404, customMessage: 'agent not found', headers: { 'X-Correlation-Id': correlationId } });
    }

    const agentRow = agent as {
      id: string;
      org_id: string;
      owner_user_id: string | null;
      slug: string;
      name: string;
      description: string | null;
      system_prompt: string | null;
      avatar_url: string | null;
      supply: number | string | null;
      num_owners: number | string | null;
      visibility: "public" | "private" | "unlisted";
      created_at: string;
      updated_at: string | null;
    };

    const { data: versions, error: versionsError } = await service
      .from('agent_version')
      .select('id, org_id, agent_id, created_at, checksum')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (versionsError) {
      return createErrorResponse(new Error(versionsError.message), { status: 400, customMessage: 'Unable to load agent versions' });
    }

    const { data: deployments, error: deploymentsError } = await service
      .from('agent_deployment')
      .select('id, org_id, agent_id, version_id, tee_provider, container_id, endpoint_url, status, status_reason, attestation, attestation_hash, last_heartbeat, created_at, updated_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
    if (deploymentsError) {
      return createErrorResponse(new Error(deploymentsError.message), { status: 400, customMessage: 'Unable to load agent deployments' });
    }

    const performanceSelect = shouldRedactConfig
      ? 'realized_pnl_usd, volume_usd'
      : 'realized_pnl_usd, volume_usd, win_rate_percent, total_trades, wins, losses, average_return_percent';
    const { data: performanceRow } = await service
      .from('agent_performance_summary')
      .select(performanceSelect)
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .maybeSingle();

    const { data: strategyRow } = await service
      .from('agent_strategy_snapshot')
      .select('id, template_id, blockly_xml, summary, workflow, created_at')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const agentPayload: Record<string, UntypedJson> = {
      ...agentRow,
      ...(shouldRedactConfig ? { system_prompt: null } : {}),
      ...((performanceRow ?? {}) as Record<string, UntypedJson>),
      strategy_snapshot: strategyRow ?? undefined,
      owner_user_id: shouldRedactConfig ? null : agentRow.owner_user_id,
    };

    const deploymentsPayload = (deployments ?? []).map((deployment) => {
      const row = deployment as Record<string, UntypedJson> & {
        container_id?: string | null;
        endpoint_url?: string | null;
        attestation?: UntypedJson | null;
      };
      return {
        ...row,
        container_id: canManage ? (row.container_id ?? null) : null,
        endpoint_url: canManage ? (row.endpoint_url ?? null) : null,
        attestation: canManage ? (row.attestation ?? null) : null,
      };
    });

    return createSuccessResponse(
      { ok: true, agent: agentPayload, versions: versions ?? [], deployments: deploymentsPayload },
      { headers: { 'X-Correlation-Id': correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const raw = await req.json().catch(() => ({}));
    const input = PatchSchema.parse(raw);

    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    const service = access.service;
    const correlationId = access.correlationId;

    if (!access.canManage || !canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }
    const canViewPrivateConfig = access.canViewPrivateConfig;
    if (access.agent.visibility === 'private' && input.systemPrompt !== undefined && !canViewPrivateConfig) {
      return createErrorResponse(new Error('Forbidden'), { status: 403, customMessage: 'Only owner/admin can edit system prompt for private agents.' });
    }

    const update: Record<string, UntypedJson> = {};
    if (typeof input.name === 'string') update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (typeof input.visibility === 'string') update.visibility = input.visibility;
    if (input.systemPrompt !== undefined) update.system_prompt = input.systemPrompt;
    if (input.avatarUrl !== undefined) update.avatar_url = input.avatarUrl;

    if (Object.keys(update).length === 0) {
      return createErrorResponse(new Error('empty_update'), { status: 400, customMessage: 'No fields to update' });
    }

    const { data: agent, error } = await service
      .from('agent')
      .update(update)
      .eq('id', agentId)
      .eq('org_id', access.agent.orgId)
      .select('id, org_id, slug, name, description, avatar_url, supply, num_owners, visibility, created_at, updated_at')
      .single();

    if (error) {
      return createErrorResponse(new Error(error.message), { status: 400, customMessage: 'agent update failed' });
    }

    return createSuccessResponse({ ok: true, agent }, { headers: { 'X-Correlation-Id': correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/agents/[id]
 *
 * Soft-deletes an agent by setting `deleted_at` and making it private.
 * Also deactivates all active listings for the agent.
 *
 * Only the agent owner or an org admin/owner can delete an agent.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    const service = access.service;
    const correlationId = access.correlationId;

    // Only owner or org admin/owner can delete
    const isOwner = access.userId !== null && access.agent.ownerUserId === access.userId;
    const isOrgAdmin = access.membershipRole === "owner" || access.membershipRole === "admin";
    if (!isOwner && !isOrgAdmin) {
      return createErrorResponse(new Error('Forbidden'), {
        status: 403,
        customMessage: 'Only the agent owner or org admin can delete an agent.',
        headers: { 'X-Correlation-Id': correlationId },
      });
    }

    const deletedAt = new Date().toISOString();

    // 1. Soft-delete the agent
    const { error: deleteError } = await service
      .from('agent')
      .update({ deleted_at: deletedAt, visibility: 'private' })
      .eq('id', agentId)
      .eq('org_id', access.agent.orgId);

    if (deleteError) {
      return createErrorResponse(new Error(deleteError.message), {
        status: 400,
        customMessage: 'Failed to delete agent',
        headers: { 'X-Correlation-Id': correlationId },
      });
    }

    // 2. Deactivate all active listings (cascading soft-delete)
    const { error: listingError } = await service
      .from('agent_listing')
      .update({ active: false })
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .eq('active', true);

    if (listingError) {
      logger.error("agent_delete_listing_deactivation_failed", {
        agentId,
        error: listingError.message,
      });
      // Non-fatal: agent is already soft-deleted, listings will be orphaned but inactive
    }

    // 3. Stop running deployments
    const { error: deployError } = await service
      .from('agent_deployment')
      .update({ status: 'stopped', status_reason: 'Agent deleted' })
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .eq('status', 'running');

    if (deployError) {
      logger.error("agent_delete_deployment_stop_failed", {
        agentId,
        error: deployError.message,
      });
      // Non-fatal: best-effort cleanup
    }

    logger.info("agent_soft_deleted", {
      agentId,
      orgId: access.agent.orgId,
      deletedBy: access.userId,
      deletedAt,
    });

    return createSuccessResponse(
      { ok: true, agentId, deletedAt },
      { headers: { 'X-Correlation-Id': correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
