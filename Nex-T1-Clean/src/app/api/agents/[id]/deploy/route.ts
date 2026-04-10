export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { createErrorResponse, createSuccessResponse } from '@/lib/request-utils';
import { createAndStartContainer, verifyContainerAttestation } from '@/server/services/tee/container';
import { attestRuntimeEndpoint } from '@/server/services/tee/runtime-endpoint';
import { isInternalTeeProvider } from '@/server/services/tee/runtime-provider';
import { canManageAgent } from '@/server/agents/access';
import { encryptSecret } from '@/server/security/wallet-vault';
import { createServiceRoleClient } from '@/server/services/supabase/service-role';
import { resolveAgentAccess } from '@/server/agents/agent-access';


import { logger } from '@/lib/logger';
const DEFAULT_MORALIS_MCP_URL = 'https://moralis.nex-t1.ai/mcp';
type ToolConfig = { id: string; config: UntypedJson };
type ToolConfigSource = { tools?: UntypedJson };

function normalizeMcpUrl(rawUrl: string, options?: { ensureMcpPath?: boolean }): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (!options?.ensureMcpPath) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.pathname === '' || url.pathname === '/') {
      url.pathname = '/mcp';
      return url.toString();
    }
    if (url.pathname.endsWith('/mcp/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
      return url.toString();
    }
    return trimmed;
  } catch {
    const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
    if (withoutTrailingSlash.endsWith('/mcp')) return withoutTrailingSlash;
    return `${withoutTrailingSlash}/mcp`;
  }
}

const DeploySchema = z.object({
  orgId: z.string().uuid().optional(),
  versionId: z.string().uuid(),
  image: z.string().min(1),
  attestationPolicy: z.object({
    provider: z.string().min(1),
    version: z.string().min(1),
    // Deprecated: policy measurements must be loaded server-side from attestation_policy.
    measurements: z.array(z.string()).optional(),
  }),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: agentId } = await context.params;
    const raw = await req.json();
    const input = DeploySchema.parse(raw);
    const usesInternalRuntime = isInternalTeeProvider(input.attestationPolicy.provider);
    const internalRuntimeBaseUrl = process.env.TEE_RUNTIME_BASE_URL?.trim() || '';
    const internalRuntimeSessionKey = process.env.TEE_RUNTIME_SESSION_KEY_B64?.trim() || '';
    if (usesInternalRuntime && !internalRuntimeBaseUrl) {
      return createErrorResponse(new Error('Missing TEE runtime base URL'), {
        status: 400,
        customMessage: 'TEE runtime base URL is not configured',
      });
    }
    if (usesInternalRuntime && !internalRuntimeSessionKey) {
      return createErrorResponse(new Error('Missing TEE runtime session key'), {
        status: 400,
        customMessage: 'TEE runtime session key is not configured',
      });
    }
    if (usesInternalRuntime && internalRuntimeBaseUrl) {
      try {
        new URL(internalRuntimeBaseUrl);
      } catch {
        return createErrorResponse(new Error('Invalid TEE runtime base URL'), {
          status: 400,
          customMessage: 'TEE runtime base URL is invalid',
        });
      }
    }
    const accessResult = await resolveAgentAccess(req, agentId, { allowPublic: false, requireMembership: true });
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;
    if (!canManageAgent(access.membershipRole)) {
      return createErrorResponse(new Error('Forbidden'), { status: 403 });
    }
    const supabase = access.service;

    const { data: versionRow, error: versionError } = await supabase
      .from('agent_version')
      .select('id, org_id, agent_id, config')
      .eq('id', input.versionId)
      .eq('agent_id', agentId)
      .eq('org_id', access.agent.orgId)
      .maybeSingle();
    if (versionError) {
      return createErrorResponse(new Error(versionError.message), { status: 400, customMessage: 'Unable to load agent version' });
    }
    if (!versionRow) {
      return createErrorResponse(new Error('Version not found'), { status: 404, customMessage: 'Version not found for agent' });
    }

    const config = (versionRow as { config?: UntypedJson }).config;
    const toolSource = config && typeof config === 'object' ? (config as ToolConfigSource) : null;
    const enabledTools = Array.isArray(toolSource?.tools)
      ? (toolSource.tools as Array<{ id?: UntypedJson; config?: UntypedJson }>)
          .map((tool) => ({
            id: typeof tool?.id === 'string' ? tool.id : null,
            config: tool?.config,
          }))
          .filter((tool): tool is ToolConfig => Boolean(tool.id))
      : [];
    const moralisTool = enabledTools.find((tool) => tool.id === 'moralis');
    const uniswapTool = enabledTools.find((tool) => tool.id === 'uniswap');

    // Per-deployment session key: used to authenticate runtime invocations and open sealed envelopes.
    // Stored server-side (encrypted) and injected into the runtime container env.
    const runtimeSessionKeyB64 = usesInternalRuntime ? internalRuntimeSessionKey : randomBytes(32).toString('base64');

    const runtimeEnv: Record<string, string> = {
      RUNTIME_SESSION_KEY_B64: runtimeSessionKeyB64,
      // Keep runtime network egress tightly controlled; allowlist must include AI gateway + MCP hosts.
      ...(process.env.EGRESS_ALLOWLIST ? { EGRESS_ALLOWLIST: process.env.EGRESS_ALLOWLIST } : {}),
      ...(process.env.EGRESS_TIMEOUT_MS ? { EGRESS_TIMEOUT_MS: process.env.EGRESS_TIMEOUT_MS } : {}),
      ...(process.env.MAX_EGRESS_BYTES ? { MAX_EGRESS_BYTES: process.env.MAX_EGRESS_BYTES } : {}),
      ...(process.env.INVOKE_TIMEOUT_MS ? { INVOKE_TIMEOUT_MS: process.env.INVOKE_TIMEOUT_MS } : {}),
      ...(process.env.MAX_TOOL_STEPS ? { MAX_TOOL_STEPS: process.env.MAX_TOOL_STEPS } : {}),
      ...(process.env.MAX_VALUE_MOVING_TOOL_CALLS ? { MAX_VALUE_MOVING_TOOL_CALLS: process.env.MAX_VALUE_MOVING_TOOL_CALLS } : {}),
      ...(process.env.MAX_VALUE_MOVING_NOTIONAL_USD ? { MAX_VALUE_MOVING_NOTIONAL_USD: process.env.MAX_VALUE_MOVING_NOTIONAL_USD } : {}),
      ...(process.env.AI_GATEWAY_API_KEY ? { AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY } : {}),
      ...(process.env.VERCEL_AI_GATEWAY_API_KEY ? { VERCEL_AI_GATEWAY_API_KEY: process.env.VERCEL_AI_GATEWAY_API_KEY } : {}),
      ...(process.env.AI_GATEWAY_BASE_URL ? { AI_GATEWAY_BASE_URL: process.env.AI_GATEWAY_BASE_URL } : {}),
      ...(process.env.VERCEL_AI_GATEWAY_BASE_URL ? { VERCEL_AI_GATEWAY_BASE_URL: process.env.VERCEL_AI_GATEWAY_BASE_URL } : {}),
      ...(process.env.SESSION_KEY_HEADER ? { SESSION_KEY_HEADER: process.env.SESSION_KEY_HEADER } : {}),
    };

    // Optional: enable Moralis MCP for this deployment when the agent version includes it.
    if (moralisTool) {
      const cfg = moralisTool.config && typeof moralisTool.config === 'object' ? (moralisTool.config as Record<string, UntypedJson>) : null;
      const urlCandidate = typeof cfg?.url === 'string' ? cfg.url : typeof cfg?.baseUrl === 'string' ? cfg.baseUrl : null;
      const moralisUrl = normalizeMcpUrl(
        (urlCandidate ?? process.env.MCP_MORALIS_MCP_URL ?? DEFAULT_MORALIS_MCP_URL).trim(),
        { ensureMcpPath: true },
      );
      runtimeEnv.MCP_MORALIS_MCP_URL = moralisUrl;

      if (process.env.MCP_MORALIS_MCP_API_KEY) runtimeEnv.MCP_MORALIS_MCP_API_KEY = process.env.MCP_MORALIS_MCP_API_KEY;
      if (process.env.MCP_MORALIS_MCP_ALLOWED_TOOLS_READONLY) {
        runtimeEnv.MCP_MORALIS_MCP_ALLOWED_TOOLS_READONLY = process.env.MCP_MORALIS_MCP_ALLOWED_TOOLS_READONLY;
      }
      if (process.env.MCP_MORALIS_MCP_ALLOWED_TOOLS_TRADING) {
        runtimeEnv.MCP_MORALIS_MCP_ALLOWED_TOOLS_TRADING = process.env.MCP_MORALIS_MCP_ALLOWED_TOOLS_TRADING;
      }

      // Ensure the Moralis MCP host is allowlisted for runtime egress if an allowlist is configured.
      if (runtimeEnv.EGRESS_ALLOWLIST) {
        try {
          const host = new URL(moralisUrl).hostname;
          const hosts = runtimeEnv.EGRESS_ALLOWLIST.split(',').map((h) => h.trim()).filter(Boolean);
          if (!hosts.includes(host)) {
            runtimeEnv.EGRESS_ALLOWLIST = [...hosts, host].join(',');
          }
        } catch {
          // ignore malformed URLs; runtime will fail safely on egress checks
        }
      }
    }

    if (uniswapTool) {
      const cfg = uniswapTool.config && typeof uniswapTool.config === 'object' ? (uniswapTool.config as Record<string, UntypedJson>) : null;
      const urlCandidate = typeof cfg?.url === 'string' ? cfg.url : typeof cfg?.baseUrl === 'string' ? cfg.baseUrl : null;
      const uniswapUrl = normalizeMcpUrl((urlCandidate ?? process.env.MCP_UNISWAP_MCP_URL ?? '').trim());

      if (!uniswapUrl) {
        return createErrorResponse(new Error('Missing MCP_UNISWAP_MCP_URL'), {
          status: 400,
          customMessage: 'Uniswap MCP URL is not configured for this deployment',
        });
      }

      runtimeEnv.MCP_UNISWAP_MCP_URL = uniswapUrl;
      if (process.env.MCP_UNISWAP_MCP_API_KEY) runtimeEnv.MCP_UNISWAP_MCP_API_KEY = process.env.MCP_UNISWAP_MCP_API_KEY;
      if (process.env.MCP_UNISWAP_MCP_ALLOWED_TOOLS_READONLY) {
        runtimeEnv.MCP_UNISWAP_MCP_ALLOWED_TOOLS_READONLY = process.env.MCP_UNISWAP_MCP_ALLOWED_TOOLS_READONLY;
      }
      if (process.env.MCP_UNISWAP_MCP_ALLOWED_TOOLS_TRADING) {
        runtimeEnv.MCP_UNISWAP_MCP_ALLOWED_TOOLS_TRADING = process.env.MCP_UNISWAP_MCP_ALLOWED_TOOLS_TRADING;
      }

      if (runtimeEnv.EGRESS_ALLOWLIST) {
        try {
          const host = new URL(uniswapUrl).hostname;
          const hosts = runtimeEnv.EGRESS_ALLOWLIST.split(',').map((h) => h.trim()).filter(Boolean);
          if (!hosts.includes(host)) {
            runtimeEnv.EGRESS_ALLOWLIST = [...hosts, host].join(',');
          }
        } catch {
          // ignore malformed URLs; runtime will fail safely on egress checks
        }
      }
    }

    const handle = usesInternalRuntime
      ? { id: `railway:${randomBytes(8).toString('hex')}`, url: internalRuntimeBaseUrl }
      : await createAndStartContainer({
          orgId: access.agent.orgId,
          agentId,
          versionId: input.versionId,
          image: input.image,
          env: runtimeEnv,
        });

    // Insert deployment row in creating
    const { data: dep, error: derr } = await supabase
      .from('agent_deployment')
      .insert({
        org_id: access.agent.orgId,
        agent_id: agentId,
        version_id: input.versionId,
        tee_provider: input.attestationPolicy.provider,
        container_id: handle.id,
        endpoint_url: handle.url ?? null,
        status: 'creating',
      })
      .select('id, org_id, agent_id, version_id, tee_provider, container_id, endpoint_url, status, status_reason, attestation, attestation_hash, last_heartbeat, created_at, updated_at')
      .single();
    if (derr) return createErrorResponse(new Error(derr.message), { status: 400, customMessage: 'deployment insert failed' });

    // Persist the session key as a service-role-only readable secret (agent_secret_version has service_role read policy).
    const { error: sessionSecretError } = await supabase.from('agent_secret_version').insert({
        org_id: access.agent.orgId,
        agent_id: agentId,
        agent_version_id: input.versionId,
        key_name: `tee_session_key:${dep.id}`,
        envelope: encryptSecret(runtimeSessionKeyB64),
      });
    if (sessionSecretError) {
      logger.error('[agents.deploy] failed to store tee session key secret', sessionSecretError);
      await supabase
        .from('agent_deployment')
        .update({ status: 'failed', status_reason: 'session_key_store_failed' })
        .eq('id', dep.id);
      return createErrorResponse(new Error(sessionSecretError.message), {
        status: 500,
        customMessage: 'Failed to persist deployment session secret',
      });
    }

    const service = createServiceRoleClient();
    const { data: policyRow, error: policyError } = await service
      .from('attestation_policy')
      .select('provider,version,measurements,active')
      .eq('provider', input.attestationPolicy.provider)
      .eq('version', input.attestationPolicy.version)
      .maybeSingle();

    if (policyError) {
      return createErrorResponse(new Error(policyError.message), { status: 500, customMessage: 'Unable to load attestation policy' });
    }
    if (!policyRow || policyRow.active === false) {
      return createErrorResponse(new Error('Missing attestation policy'), {
        status: 400,
        customMessage: 'Attestation policy not pinned yet for provider/version',
      });
    }

    const attestationPolicy = {
      provider: policyRow.provider,
      version: policyRow.version,
      measurements: policyRow.measurements ?? [],
    };
    const att = usesInternalRuntime
      ? await attestRuntimeEndpoint(handle.url ?? internalRuntimeBaseUrl, attestationPolicy)
      : await verifyContainerAttestation(handle.id, attestationPolicy);
    if (!att.ok) {
      await supabase
        .from('agent_deployment')
        .update({ status: 'failed', status_reason: att.reason, attestation_hash: att.hash, attestation: att.artifact ?? null })
        .eq('id', dep.id);
      return createErrorResponse(new Error('Attestation failed'), { status: 400, customMessage: 'attestation failed' });
    }

    const { data: updated, error: uerr } = await supabase
      .from('agent_deployment')
      .update({ status: 'running', attestation_hash: att.hash, attestation: att.artifact ?? null })
      .eq('id', dep.id)
      .select('id, org_id, agent_id, version_id, tee_provider, container_id, endpoint_url, status, status_reason, attestation, attestation_hash, last_heartbeat, created_at, updated_at')
      .single();
    if (uerr) return createErrorResponse(new Error(uerr.message), { status: 400, customMessage: 'deployment update failed' });

    return createSuccessResponse({ ok: true, deployment: updated }, { headers: { 'X-Correlation-Id': access.correlationId } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
