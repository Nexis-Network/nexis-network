/**
 * Handoff Persistence
 * Persists agent-to-human handoff summaries to Supabase for tracking and resolution.
 */

import "server-only";

import { logger } from "@/lib/logger";
import { matchesSupabaseError, toSupabaseLogContext } from "@/lib/errors/supabase";
import { createClient } from "@/server/services/supabase/server";
import type { HandoffSummary } from "./handoff-contract";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HANDOFF_TABLE = "agent_handoffs";

const MISSING_TABLE_PATTERNS = [
  /Could not find the table 'public\.agent_handoffs'/i,
  /relation "public\.agent_handoffs" does not exist/i,
  /relation "agent_handoffs" does not exist/i,
];

function isMissingHandoffsTable(error: unknown): boolean {
  return matchesSupabaseError(error, {
    codes: ["42P01", "PGRST102"],
    messagePatterns: MISSING_TABLE_PATTERNS,
  });
}

async function requireSupabaseClient() {
  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  return supabase;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function persistHandoffSummary(
  summary: HandoffSummary,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await requireSupabaseClient();

    const { error } = await supabase.from(HANDOFF_TABLE).insert({
      handoff_id: summary.handoffId,
      created_at: summary.createdAt,
      session_id: summary.sessionId,
      user_id: summary.userId,
      user_identifier: summary.userIdentifier,
      request_summary: summary.requestSummary,
      request_category: summary.requestCategory,
      escalation_reason: summary.escalationReason,
      escalation_detail: summary.escalationDetail,
      severity: summary.severity,
      attempted_actions: summary.attemptedActions,
      verified_prerequisites: summary.verifiedPrerequisites,
      monetary_impact: summary.monetaryImpact,
      recommended_action: summary.recommendedAction,
      confidence_notes: summary.confidenceNotes,
      working_memory_snapshot: summary.workingMemorySnapshot,
      relevant_artifact_ids: summary.relevantArtifactIds,
    });

    if (error) {
      if (isMissingHandoffsTable(error)) {
        logger.warn("[handoff-persistence] agent_handoffs table does not exist yet — skipping persistence");
        return { success: false, error: "table_not_found" };
      }
      logger.error("[handoff-persistence] Failed to persist handoff summary", {
        handoffId: summary.handoffId,
        ...toSupabaseLogContext(error),
      });
      return { success: false, error: error.message };
    }

    logger.info("[handoff-persistence] Handoff summary persisted", {
      handoffId: summary.handoffId,
      severity: summary.severity,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[handoff-persistence] Unexpected error persisting handoff", { error: message });
    return { success: false, error: message };
  }
}

export async function getHandoffSummary(
  handoffId: string,
): Promise<HandoffSummary | null> {
  try {
    const supabase = await requireSupabaseClient();

    const { data, error } = await supabase
      .from(HANDOFF_TABLE)
      .select("*")
      .eq("handoff_id", handoffId)
      .maybeSingle();

    if (error) {
      if (isMissingHandoffsTable(error)) {
        logger.warn("[handoff-persistence] agent_handoffs table does not exist yet");
        return null;
      }
      logger.error("[handoff-persistence] Failed to read handoff summary", {
        handoffId,
        ...toSupabaseLogContext(error),
      });
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      handoffId: data.handoff_id,
      createdAt: data.created_at,
      sessionId: data.session_id,
      userId: data.user_id,
      userIdentifier: data.user_identifier,
      requestSummary: data.request_summary,
      requestCategory: data.request_category,
      escalationReason: data.escalation_reason,
      escalationDetail: data.escalation_detail,
      severity: data.severity,
      attemptedActions: data.attempted_actions ?? [],
      verifiedPrerequisites: data.verified_prerequisites ?? [],
      monetaryImpact: data.monetary_impact ?? null,
      recommendedAction: data.recommended_action,
      confidenceNotes: data.confidence_notes,
      workingMemorySnapshot: data.working_memory_snapshot,
      relevantArtifactIds: data.relevant_artifact_ids ?? [],
    } as HandoffSummary;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[handoff-persistence] Unexpected error reading handoff", { error: message });
    return null;
  }
}

export async function resolveHandoff(
  handoffId: string,
  resolvedBy: string,
  notes: string,
): Promise<boolean> {
  try {
    const supabase = await requireSupabaseClient();

    const { error, count } = await supabase
      .from(HANDOFF_TABLE)
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
        resolution_notes: notes,
      })
      .eq("handoff_id", handoffId)
      .is("resolved_at", null);

    if (error) {
      if (isMissingHandoffsTable(error)) {
        logger.warn("[handoff-persistence] agent_handoffs table does not exist yet");
        return false;
      }
      logger.error("[handoff-persistence] Failed to resolve handoff", {
        handoffId,
        ...toSupabaseLogContext(error),
      });
      return false;
    }

    const updated = typeof count === "number" ? count > 0 : true;
    if (updated) {
      logger.info("[handoff-persistence] Handoff resolved", { handoffId, resolvedBy });
    }
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[handoff-persistence] Unexpected error resolving handoff", { error: message });
    return false;
  }
}
