export const maxDuration = 15;

import { connection, NextRequest } from "next/server";
import { z } from "zod";

import { buildStrategySnapshot } from "@/lib/strategies/conversion";
import {
  createErrorResponse,
  createSuccessResponse,
  getOrCreateCorrelationId,
} from "@/lib/request-utils";
import { requireSupabaseUser } from "@/server/api/helpers/with-supabase-user";
import { commitActiveOrgCookies, ensureActiveOrg } from "@/server/organization/active-org";

const DraftPayloadSchema = z.object({
  orgId: z.string().uuid().optional(),
  name: z.string().min(2).max(160),
  prompt: z.string().max(4000).optional(),
  templateId: z.string().optional(),
  blocklyXml: z.string().min(10),
});

export async function GET(req: NextRequest) {
  await connection();
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const { supabase, userId: ownerId } = auth;

    const url = new URL(req.url);
    const orgIdFilter = url.searchParams.get("orgId");
    if (orgIdFilter) {
      const parsedOrgId = z.string().uuid().safeParse(orgIdFilter);
      if (!parsedOrgId.success) {
        return createErrorResponse(new Error("Invalid orgId"), {
          status: 400,
          customMessage: "orgId must be a valid UUID",
        });
      }
    }

    const query = supabase
      .from("agent_strategy_draft")
      .select(
        "id, org_id, owner_user_id, name, prompt, template_id, blockly_xml, summary, workflow, created_at, last_saved_at",
      )
      .eq("owner_user_id", ownerId)
      .order("last_saved_at", { ascending: false })
      .limit(50);

    if (orgIdFilter) {
      query.eq("org_id", orgIdFilter);
    }

    const { data, error } = await query;
    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 500,
        customMessage: "Failed to load drafts",
      });
    }

    return createSuccessResponse(
      { ok: true, drafts: data ?? [] },
      { headers: { "X-Correlation-Id": correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const { supabase, userId: ownerId } = auth;

    const raw = await req.json();
    const input = DraftPayloadSchema.parse(raw);
    const orgResolution = input.orgId ? null : await ensureActiveOrg({ cookieSource: req.cookies });
    if (orgResolution && !orgResolution.ok) return orgResolution.response;
    const orgId = input.orgId ?? orgResolution?.orgId;
    if (!orgId) {
      return createErrorResponse(new Error("Missing org id"), { status: 400, customMessage: "orgId required" });
    }
    const snapshot = buildStrategySnapshot(input.blocklyXml, input.templateId);

    const { data, error } = await supabase
      .from("agent_strategy_draft")
      .insert({
        org_id: orgId,
        owner_user_id: ownerId,
        name: input.name,
        prompt: input.prompt ?? "",
        template_id: input.templateId ?? null,
        blockly_xml: snapshot.blocklyXml,
        workflow: snapshot.workflow,
        summary: snapshot.summary,
      })
      .select("*")
      .single();

    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 500,
        customMessage: "Failed to create strategy draft",
      });
    }

    let response = createSuccessResponse(
      { ok: true, draft: data },
      { status: 201, headers: { "X-Correlation-Id": correlationId } },
    );
    response = orgResolution ? commitActiveOrgCookies(orgResolution, response) : response;
    return response;
  } catch (error) {
    return createErrorResponse(error);
  }
}
