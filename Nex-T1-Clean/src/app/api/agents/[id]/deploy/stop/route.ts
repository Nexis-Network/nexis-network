export const maxDuration = 30;

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/request-utils';
import { stopAndDestroyContainer } from '@/server/services/tee/container';
import { canManageAgent } from '@/server/agents/access';
import { resolveAgentAccess } from "@/server/agents/agent-access";

const StopSchema = z
  .object({
    deploymentId: z.string().uuid(),
    // Back-compat: ignore any client-supplied container id.
    containerId: z.string().min(1).optional(),
  })
  .passthrough();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }
    const raw = await req.json();
    const input = StopSchema.parse(raw);

    const { data: deploymentRow, error: deploymentError } = await access.service
      .from('agent_deployment')
      .select('id, container_id, status, org_id, agent_id')
      .eq('id', input.deploymentId)
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .maybeSingle();
    if (deploymentError) {
      return createErrorResponse(new Error(deploymentError.message), { status: 400, customMessage: 'Unable to load deployment' });
    }
    if (!deploymentRow) {
      return createErrorResponse(new Error('Deployment not found'), { status: 404, customMessage: 'Deployment not found' });
    }
    if (!deploymentRow.container_id) {
      return createErrorResponse(new Error('Deployment has no container id'), { status: 400, customMessage: 'Deployment container id missing' });
    }

    await stopAndDestroyContainer(deploymentRow.container_id);
    const { data: updated, error } = await access.service
      .from('agent_deployment')
      .update({ status: 'stopped', status_reason: 'stopped by user' })
      .eq('id', input.deploymentId)
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .select('id, org_id, agent_id, version_id, tee_provider, container_id, endpoint_url, status, status_reason, attestation, attestation_hash, last_heartbeat, created_at, updated_at')
      .single();
    if (error) return createErrorResponse(new Error(error.message), { status: 400, customMessage: 'deployment update failed' });
    return createSuccessResponse({ ok: true, deployment: updated }, { headers: { 'X-Correlation-Id': access.correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
