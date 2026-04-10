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

type RouteContext = {
  params: Promise<{ draftId: string }>;
};

const UpdateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  prompt: z.string().max(4000).optional(),
  templateId: z.string().optional(),
  blocklyXml: z.string().min(10).optional(),
  workflow: z.any().optional(),
});

export async function GET(req: NextRequest, context: RouteContext) {
  await connection();
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const { supabase, userId: ownerId } = auth;

    const { draftId } = await context.params;
    const { data, error } = await supabase
      .from("agent_strategy_draft")
      .select(
        "id, org_id, owner_user_id, name, prompt, template_id, blockly_xml, summary, workflow, created_at, last_saved_at",
      )
      .eq("id", draftId)
      .eq("owner_user_id", ownerId)
      .single();

    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 404,
        customMessage: "Draft not found",
      });
    }

    return createSuccessResponse(
      { ok: true, draft: data },
      { headers: { "X-Correlation-Id": correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const { supabase, userId: ownerId } = auth;

    const raw = await req.json();
    const input = UpdateSchema.parse(raw);
    if (Object.keys(input).length === 0) {
      return createErrorResponse(new Error("Empty payload"), { status: 400 });
    }

    const { draftId } = await context.params;

    const updates: Record<string, UntypedJson> = {
      last_saved_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.prompt !== undefined) updates.prompt = input.prompt;
    if (input.templateId !== undefined) updates.template_id = input.templateId;
    if (input.workflow !== undefined) updates.workflow = input.workflow;

    if (input.blocklyXml) {
      const snapshot = buildStrategySnapshot(input.blocklyXml, input.templateId);
      updates.blockly_xml = snapshot.blocklyXml;
      updates.summary = snapshot.summary;
      updates.workflow = snapshot.workflow;
    }

    const { data, error } = await supabase
      .from("agent_strategy_draft")
      .update(updates)
      .eq("id", draftId)
      .eq("owner_user_id", ownerId)
      .select("*")
      .single();

    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: "Failed to update draft",
      });
    }

    return createSuccessResponse(
      { ok: true, draft: data },
      { headers: { "X-Correlation-Id": correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const correlationId = getOrCreateCorrelationId(req);
    const auth = await requireSupabaseUser(req);
    if (!auth.ok) return auth.response;
    const { supabase, userId: ownerId } = auth;

    const { draftId } = await context.params;

    const { error } = await supabase
      .from("agent_strategy_draft")
      .delete()
      .eq("id", draftId)
      .eq("owner_user_id", ownerId);

    if (error) {
      return createErrorResponse(new Error(error.message), {
        status: 400,
        customMessage: "Failed to delete draft",
      });
    }

    return createSuccessResponse(
      { ok: true, deleted: true },
      { headers: { "X-Correlation-Id": correlationId } },
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
