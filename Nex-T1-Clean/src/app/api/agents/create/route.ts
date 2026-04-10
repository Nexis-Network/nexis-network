export const maxDuration = 15;

import { NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";

import { createErrorResponse, createSuccessResponse, getOrCreateCorrelationId } from "@/lib/request-utils";
import { buildStrategySnapshot } from "@/lib/strategies/conversion";
import { ensureActiveOrg, commitActiveOrgCookies } from "@/server/organization/active-org";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { provisionAgentCdpWallets } from "@/server/services/cdp/agent-provision";
import { requireAgentCreateAuth } from "@/app/api/agents/create/route.auth";
import { CreateSchema } from "@/app/api/agents/create/route.schema";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  return timeApiRoute("agents.create.POST", async () => {
    try {
      const auth = await requireAgentCreateAuth(req);
      if (!auth.ok) return auth.response;
      const { correlationId, supabase, userId } = auth.auth;

      const raw = await req.json().catch(() => ({}));
      const parsed = CreateSchema.safeParse(raw);
      if (!parsed.success) {
        return createErrorResponse(parsed.error, {
          status: 400,
          customMessage: "Invalid request body",
          headers: { "X-Correlation-Id": correlationId },
        });
      }
      const input = parsed.data;

      const orgResolution = input.orgId ? null : await ensureActiveOrg({ cookieSource: req.cookies });
      if (orgResolution && !orgResolution.ok) {
        orgResolution.response.headers.set("X-Correlation-Id", correlationId);
        return orgResolution.response;
      }

      const orgId = input.orgId ?? orgResolution?.orgId;

      if (!orgId) {
        return createErrorResponse(new Error("missing_org"), {
          status: 400,
          customMessage: "Missing org id",
          headers: { "X-Correlation-Id": correlationId },
        });
      }

      // Insert agent
      const { data: agent, error: aerr } = await supabase
        .from('agent')
        .insert({
          org_id: orgId,
          owner_user_id: userId,
          slug: input.slug,
          name: input.name,
          description: input.description,
          system_prompt: input.systemPrompt,
          avatar_url: input.avatarUrl ?? null,
          visibility: input.visibility,
        })
        .select('id, org_id, owner_user_id, slug, name, description, system_prompt, avatar_url, supply, num_owners, visibility, created_at, updated_at')
        .single();
      if (aerr) {
        return createErrorResponse(new Error(aerr.message), {
          status: 400,
          customMessage: "Agent insert failed",
          headers: { "X-Correlation-Id": correlationId },
        });
      }

      const enhancedConfig =
        input.strategy && typeof input.versionConfig === "object"
          ? {
              ...input.versionConfig,
              strategy: buildStrategySnapshot(input.strategy.blocklyXml, input.strategy.templateId),
            }
          : input.versionConfig;

      const checksum = `sha256:${createHash("sha256").update(JSON.stringify(enhancedConfig)).digest("hex")}`;

      // Insert version
      const { data: version, error: verr } = await supabase
        .from('agent_version')
        .insert({ org_id: orgId, agent_id: agent.id, config: enhancedConfig, checksum })
        .select('id, org_id, agent_id, checksum, created_at')
        .single();
      if (verr) {
        return createErrorResponse(new Error(verr.message), {
          status: 400,
          customMessage: "Version insert failed",
          headers: { "X-Correlation-Id": correlationId },
        });
      }

      if (input.strategy) {
        const snapshot = buildStrategySnapshot(input.strategy.blocklyXml, input.strategy.templateId);
        const { error: snapshotError } = await supabase.from('agent_strategy_snapshot').insert({
          org_id: orgId,
          agent_id: agent.id,
          agent_version_id: version.id,
          template_id: input.strategy.templateId ?? null,
          blockly_xml: snapshot.blocklyXml,
          workflow: snapshot.workflow,
          summary: snapshot.summary,
        });
        if (snapshotError) {
          return createErrorResponse(new Error(snapshotError.message), {
            status: 400,
            customMessage: "Strategy snapshot insert failed",
            headers: { "X-Correlation-Id": correlationId },
          });
        }
      }

      if (input.secrets?.length) {
        const rows = input.secrets.map((s) => ({ org_id: orgId, agent_id: agent.id, agent_version_id: version.id, key_name: s.key_name, envelope: s.envelope }));
        const { error: serr } = await supabase.from('agent_secret_version').insert(rows);
        if (serr) {
          return createErrorResponse(new Error(serr.message), {
            status: 400,
            customMessage: "Secrets insert failed",
            headers: { "X-Correlation-Id": correlationId },
          });
        }
      }
      
      // Fire-and-forget Nex Wallet provisioning for the new agent.
      // If provisioning fails, the agent is still created — the user can
      // manually retry via POST /api/agents/[id]/wallet/provision.
      provisionAgentCdpWallets({
        agentId: agent.id,
        ownerUserId: userId,
      }).catch((err) => {
        logger.error("agent_create_wallet_provision_failed", {
          agentId: agent.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      let response: Response = createSuccessResponse(
        { ok: true, agent, version },
        { status: 201, headers: { "X-Correlation-Id": correlationId } },
      );

      // Handle org cookies
      response = orgResolution ? commitActiveOrgCookies(orgResolution, response) : response;
      return response;

    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(error, {
          status: 400,
          customMessage: "Invalid request body",
        });
      }
      return createErrorResponse(error, {
        headers: { "X-Correlation-Id": getOrCreateCorrelationId(req) },
      });
    }
  });
}
