export const maxDuration = 15;

import { connection, NextRequest } from "next/server";
import { createHash } from "crypto";
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/request-utils';
import { resolveAgentAccess } from "@/server/agents/agent-access";
import { canManageAgent } from '@/server/agents/access';

const VersionSchema = z
  .object({
    orgId: z.string().uuid().optional(),
    config: z.record(z.string(), z.any()),
  })
  .passthrough();

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const { id: agentId } = await context.params;
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (access.shouldRedactConfig) {
      return createErrorResponse(new Error('Forbidden'), { status: 403, customMessage: 'Config is redacted for this agent.' });
    }

    const { data: version, error } = await access.service
      .from('agent_version')
      .select('id, org_id, agent_id, checksum, created_at, config')
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return createErrorResponse(new Error(error.message), { status: 400, customMessage: 'Unable to load version' });
    }

    return createSuccessResponse({ ok: true, version: version ?? null }, { headers: { 'X-Correlation-Id': access.correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const raw = await req.json();
    const input = VersionSchema.parse(raw);
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }

    const checksum = `sha256:${createHash("sha256").update(JSON.stringify(input.config)).digest("hex")}`;
    const { data: version, error } = await access.service
      .from('agent_version')
      .insert({ org_id: access.agent.orgId, agent_id: agentId, config: input.config, checksum })
      .select('id, org_id, agent_id, checksum, created_at')
      .single();
    if (error) return createErrorResponse(new Error(error.message), { status: 400, customMessage: 'version insert failed' });
    return createSuccessResponse({ ok: true, version }, { headers: { 'X-Correlation-Id': access.correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
