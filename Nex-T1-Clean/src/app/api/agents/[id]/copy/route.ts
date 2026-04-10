export const maxDuration = 30;

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

import { createErrorResponse, createSuccessResponse, getOrCreateCorrelationId } from "@/lib/request-utils";
import { withAuth } from "@/server/security/with-auth";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { provisionAgentCdpWallets } from "@/server/services/cdp/agent-provision";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await withAuth(req, { requireOrg: false, allowPublic: false });
    if (!auth.ok) return auth.response;

    const userId = auth.session?.user?.id ?? null;
    if (!userId) {
      return createErrorResponse(new Error("Unauthenticated"), { status: 401 });
    }

    const { id: sourceAgentId } = await ctx.params;
    if (!sourceAgentId) {
      return createErrorResponse(new Error("agent_id_missing"), { status: 400 });
    }

    const service = createServiceRoleClient();
    const orgId = auth.orgId ?? (await resolveDefaultOrgId(service, userId));
    if (!orgId) {
      return createErrorResponse(new Error("workspace_required"), {
        status: 400,
        customMessage: "You need a workspace to copy an agent. Create or join an organization first.",
      });
    }

    const { data: membership } = await service
      .from("org_member")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return createErrorResponse(new Error("Forbidden"), { status: 403 });
    }

    const { data: sourceAgent, error: sourceAgentError } = await service
      .from("agent")
      .select("id,slug,name,description,system_prompt,visibility")
      .eq("id", sourceAgentId)
      .maybeSingle();

    if (sourceAgentError) {
      return createErrorResponse(new Error(sourceAgentError.message), { status: 400, customMessage: "Unable to load source agent" });
    }
    if (!sourceAgent) {
      return createErrorResponse(new Error("Agent not found"), { status: 404, customMessage: "Source agent not found" });
    }

    if (sourceAgent.visibility !== "public" && sourceAgent.visibility !== "unlisted") {
      return createErrorResponse(new Error("Forbidden"), {
        status: 403,
        customMessage: "Only public/unlisted agents can be copied.",
      });
    }

    const { data: sourceVersion, error: sourceVersionError } = await service
      .from("agent_version")
      .select("id,config,checksum")
      .eq("agent_id", sourceAgentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sourceVersionError) {
      return createErrorResponse(new Error(sourceVersionError.message), { status: 400, customMessage: "Unable to load source version" });
    }
    if (!sourceVersion) {
      return createErrorResponse(new Error("No versions"), { status: 400, customMessage: "Source agent has no versions" });
    }

    const suffix = randomUUID().slice(0, 8);
    const slugBase = typeof sourceAgent.slug === "string" && sourceAgent.slug.trim().length > 0 ? sourceAgent.slug : "agent";
    const nextSlug = normalizeSlug(`${slugBase}-copy-${suffix}`);
    const nextName = `${sourceAgent.name} (Copy)`;

    const { data: newAgent, error: agentInsertError } = await service
      .from("agent")
      .insert({
        org_id: orgId,
        owner_user_id: userId,
        slug: nextSlug,
        name: nextName,
        description: sourceAgent.description ?? null,
        system_prompt: sourceAgent.system_prompt ?? null,
        visibility: "private",
      })
      .select("id,org_id,slug,name,visibility,created_at")
      .single();

    if (agentInsertError) {
      return createErrorResponse(new Error(agentInsertError.message), { status: 400, customMessage: "Agent copy failed" });
    }

    const { data: newVersion, error: versionInsertError } = await service
      .from("agent_version")
      .insert({
        org_id: orgId,
        agent_id: newAgent.id,
        config: sourceVersion.config,
        checksum: sourceVersion.checksum,
      })
      .select("id,org_id,agent_id,checksum,created_at")
      .single();

    if (versionInsertError) {
      return createErrorResponse(new Error(versionInsertError.message), { status: 400, customMessage: "Version copy failed" });
    }

    const { data: snapshot, error: snapshotError } = await service
      .from("agent_strategy_snapshot")
      .select("template_id,blockly_xml,workflow,summary")
      .eq("agent_id", sourceAgentId)
      .eq("agent_version_id", sourceVersion.id)
      .maybeSingle();

    if (!snapshotError && snapshot) {
      await service.from("agent_strategy_snapshot").insert({
        org_id: orgId,
        agent_id: newAgent.id,
        agent_version_id: newVersion.id,
        template_id: snapshot.template_id ?? null,
        blockly_xml: snapshot.blockly_xml,
        workflow: snapshot.workflow,
        summary: snapshot.summary,
      });
    }

    // Fire-and-forget Nex Wallet provisioning for the copied agent.
    // If provisioning fails, the copy still succeeds — the user can
    // manually retry via POST /api/agents/[id]/wallet/provision.
    provisionAgentCdpWallets({
      agentId: newAgent.id,
      ownerUserId: userId,
    }).catch((err) => {
      logger.error("agent_copy_wallet_provision_failed", {
        agentId: newAgent.id,
        sourceAgentId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return createSuccessResponse(
      { ok: true, agent: newAgent, version: newVersion },
      { headers: { "X-Correlation-Id": correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

async function resolveDefaultOrgId(service: ReturnType<typeof createServiceRoleClient>, userId: string): Promise<string | null> {
  const { data, error } = await service
    .from("org_member")
    .select("org_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  const row = data[0] as { org_id?: string | null };
  return typeof row.org_id === "string" && row.org_id.trim() ? row.org_id : null;
}
