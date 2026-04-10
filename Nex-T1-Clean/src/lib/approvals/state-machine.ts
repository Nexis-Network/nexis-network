/**
 * Approval State Machine
 * Manages tool approval lifecycle: creation, polling, response, expiration
 */

import "server-only";

import { z } from "zod";
import { getJsonBoolean, getJsonObject } from "@/lib/json";
import { matchesSupabaseError, toSupabaseLogContext } from "@/lib/errors/supabase";
import { jsonRecordSchema } from "@/lib/validation/json";
import { logger } from "@/lib/logger";
import { createClient } from "@/server/services/supabase/server";
import { observeServerOperation } from "@/server/observability/operations";
import type { JsonObject } from "@/types/json";

async function requireSupabaseClient() {
  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
  return supabase;
}

const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  autonomousMode: false,
  riskTolerance: "conservative",
  maxTransactionValueUsd: "100.00",
  preferredChains: [],
  notificationPreferences: {},
};

const SCHEMA_CACHE_MISS_PATTERNS = [
  "Could not find the table 'public.user_agent_settings'",
  "relation \"public.user_agent_settings\" does not exist",
  "relation \"user_agent_settings\" does not exist",
];

const APPROVALS_DOMAIN = "approvals";

function isMissingAgentSettingsTable(error: unknown): boolean {
  return matchesSupabaseError(error, {
    codes: ["42P01", "PGRST102", "PGRST116", "PGRST204"],
    messagePatterns: SCHEMA_CACHE_MISS_PATTERNS.map((pattern) => new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
  });
}

function normalizeNotificationPreferences(value: unknown): JsonObject {
  const parsed = jsonRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function normalizeRiskTolerance(value: unknown): AgentSettings["riskTolerance"] {
  if (value === "moderate" || value === "aggressive") {
    return value;
  }
  return "conservative";
}

function normalizePreferredChains(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

// ============================================================================
// Schemas
// ============================================================================

const AutonomousActionEnum = z.enum(["bridge", "deploy", "buy", "sell", "stake"]);

export const AUTONOMOUS_ACTIONS = AutonomousActionEnum.options;
export type AutonomousAction = z.infer<typeof AutonomousActionEnum>;

export const ApprovalPayloadSchema = z.object({
  toolId: z.enum([
    "evm_wallet",
    "token_minter",
    "bitcoin_network",
    "pumpfun_chat",
    "pumpfun_trader",
    "solana_agentkit",
    "coinbase_agentkit",
    "cdp_wallet",
    "cdp_commerce",
  ]),
  command: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  preview: z.object({
    title: z.string(),
    description: z.string(),
    items: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
        highlight: z.boolean().optional(),
      }),
    ),
    warnings: z.array(z.string()).optional(),
    estimatedCost: z
      .object({
        amount: z.string(),
        currency: z.string(),
        usd: z.string().optional(),
      })
      .optional(),
  }),
  operationType: AutonomousActionEnum.optional(),
});

export type ApprovalPayload = z.infer<typeof ApprovalPayloadSchema>;

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled" | "auto_approved";

export interface ApprovalRequest {
  id: string;
  userId: string;
  expiresAt: Date;
  payload: ApprovalPayload;
  status: ApprovalStatus;
}

export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
  metadata?: JsonObject;
}

export interface AgentSettings {
  autonomousMode: boolean;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  maxTransactionValueUsd: string | null;
  preferredChains: string[];
  notificationPreferences: JsonObject;
}

export type AutonomousActionPreferences = Record<AutonomousAction, boolean>;

export function getAutonomousActionPreferences(settings: AgentSettings): AutonomousActionPreferences {
  const source = getJsonObject(settings.notificationPreferences, "autonomous_actions");

  return AUTONOMOUS_ACTIONS.reduce((acc, action) => {
    acc[action] = getJsonBoolean(source, action) ?? false;
    return acc;
  }, {} as AutonomousActionPreferences);
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT_SECONDS = 60;
const MAX_POLL_DURATION_MS = 120000; // 2 minutes max wait
const POLL_INTERVAL_MS = 500; // Poll every 500ms

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get user's agent settings (autonomous mode, risk tolerance)
 */
export async function getUserAgentSettings(userId: string): Promise<AgentSettings> {
  return observeServerOperation(
    {
      domain: APPROVALS_DOMAIN,
      operation: "get_settings",
      budgetMs: 1200,
      context: { userId },
    },
    async () => {
      const supabase = await requireSupabaseClient();

      const { data, error } = await supabase
        .from("user_agent_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (isMissingAgentSettingsTable(error)) {
          logger.warn(
            {
              domain: APPROVALS_DOMAIN,
              operation: "get_settings_missing_table",
              userId,
              ...toSupabaseLogContext(error),
            },
            "approvals settings table unavailable; using defaults",
          );
          return { ...DEFAULT_AGENT_SETTINGS };
        }

        throw new Error(`Failed to get agent settings: ${error.message}`);
      }

      if (!data) {
        return { ...DEFAULT_AGENT_SETTINGS };
      }

      return {
        autonomousMode: Boolean(data.autonomous_mode),
        riskTolerance: normalizeRiskTolerance(data.risk_tolerance),
        maxTransactionValueUsd: typeof data.max_transaction_value_usd === "string" ? data.max_transaction_value_usd : null,
        preferredChains: normalizePreferredChains(data.preferred_chains),
        notificationPreferences: normalizeNotificationPreferences(data.notification_preferences),
      };
    },
  );
}

/**
 * Update user's agent settings
 */
export async function updateUserAgentSettings(
  userId: string,
  settings: Partial<AgentSettings>,
): Promise<void> {
  await observeServerOperation(
    {
      domain: APPROVALS_DOMAIN,
      operation: "update_settings",
      budgetMs: 1500,
      context: {
        userId,
        touchesAutonomousMode: settings.autonomousMode !== undefined,
        touchesNotificationPreferences: settings.notificationPreferences !== undefined,
      },
    },
    async () => {
      const supabase = await requireSupabaseClient();

      const updateData: JsonObject = {};
      if (settings.autonomousMode !== undefined) {
        updateData.autonomous_mode = settings.autonomousMode;
        updateData[settings.autonomousMode ? "autonomous_mode_enabled_at" : "autonomous_mode_disabled_at"] =
          new Date().toISOString();
      }
      if (settings.riskTolerance !== undefined) updateData.risk_tolerance = settings.riskTolerance;
      if (settings.maxTransactionValueUsd !== undefined)
        updateData.max_transaction_value_usd = settings.maxTransactionValueUsd;
      if (settings.preferredChains !== undefined) updateData.preferred_chains = settings.preferredChains;
      if (settings.notificationPreferences !== undefined)
        updateData.notification_preferences = settings.notificationPreferences;

      const { error } = await supabase
        .from("user_agent_settings")
        .upsert(
          {
            user_id: userId,
            ...updateData,
          },
          { onConflict: "user_id" },
        )
        .eq("user_id", userId);

      if (error) {
        if (isMissingAgentSettingsTable(error)) {
          throw new Error(
            "Agent settings storage is not provisioned. Run migration 20251102120000_tool_approvals_hitl.sql or create the user_agent_settings table before enabling automation toggles.",
          );
        }

        throw new Error(`Failed to update agent settings: ${error.message}`);
      }
    },
  );
}

/**
 * Check if autonomous mode should auto-approve
 */
export function shouldAutoApprove(
  settings: AgentSettings,
  estimatedCostUsd?: string,
  chain?: string,
  operationType?: AutonomousAction,
): boolean {
  const actionPreferences = getAutonomousActionPreferences(settings);

  const autonomousEnabled =
    operationType !== undefined ? Boolean(actionPreferences[operationType]) : settings.autonomousMode;

  if (!autonomousEnabled) {
    return false;
  }

  // Check transaction value limit
  if (estimatedCostUsd && settings.maxTransactionValueUsd) {
    const cost = parseFloat(estimatedCostUsd);
    const limit = parseFloat(settings.maxTransactionValueUsd);
    if (cost > limit) return false;
  }

  // Check preferred chains (if specified)
  if (chain && settings.preferredChains.length > 0) {
    if (!settings.preferredChains.includes(chain)) return false;
  }

  return true;
}

/**
 * Create a new approval request
 */
export async function createApprovalRequest(
  userId: string,
  payload: ApprovalPayload,
  timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS,
  metadata?: { ipAddress?: string; userAgent?: string; sessionId?: string },
): Promise<ApprovalRequest> {
  return observeServerOperation(
    {
      domain: APPROVALS_DOMAIN,
      operation: "create_request",
      budgetMs: 1500,
      context: {
        userId,
        toolId: payload.toolId,
        timeoutSeconds,
      },
    },
    async () => {
      const validatedPayload = ApprovalPayloadSchema.parse(payload);
      const supabase = await requireSupabaseClient();
      const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);

      const { data, error } = await supabase
        .from("tool_approvals")
        .insert({
          user_id: userId,
          tool_id: validatedPayload.toolId,
          command: validatedPayload.command,
          payload: validatedPayload.args,
          preview: validatedPayload.preview,
          expires_at: expiresAt.toISOString(),
          ip_address: metadata?.ipAddress,
          user_agent: metadata?.userAgent,
          session_id: metadata?.sessionId,
        })
        .select("id, status")
        .single();

      if (error) throw new Error(`Failed to create approval request: ${error.message}`);

      await supabase.from("tool_approval_audit").insert({
        approval_id: data.id,
        event_type: "created",
        user_agent: metadata?.userAgent,
        ip_address: metadata?.ipAddress,
        metadata: { timeout_seconds: timeoutSeconds },
      });

      return {
        id: data.id,
        userId,
        expiresAt,
        payload: validatedPayload,
        status: data.status as ApprovalStatus,
      };
    },
  );
}

/**
 * Get approval status (for polling)
 */
export async function getApprovalStatus(approvalId: string, userId: string): Promise<ApprovalStatus> {
  const supabase = await requireSupabaseClient();

  const { data, error } = await supabase
    .from("tool_approvals")
    .select("status")
    .eq("id", approvalId)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(`Approval not found: ${error.message}`);

  return data.status as ApprovalStatus;
}

/**
 * Get full approval details
 */
export async function getApprovalDetails(approvalId: string, userId: string): Promise<ApprovalRequest | null> {
  const supabase = await requireSupabaseClient();

  const { data, error } = await supabase
    .from("tool_approvals")
    .select("*")
    .eq("id", approvalId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to get approval: ${error.message}`);
  }

  const parsedPayload = ApprovalPayloadSchema.parse({
    toolId: data.tool_id,
    command: data.command,
    args: data.payload,
    preview: data.preview,
  });

  return {
    id: data.id,
    userId: data.user_id,
    expiresAt: new Date(data.expires_at),
    status: data.status as ApprovalStatus,
    payload: parsedPayload,
  };
}

/**
 * Respond to approval request (approve or reject)
 */
export async function respondToApproval(
  approvalId: string,
  userId: string,
  response: ApprovalResponse,
  metadata?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  await observeServerOperation(
    {
      domain: APPROVALS_DOMAIN,
      operation: "respond",
      budgetMs: 1500,
      context: {
        approvalId,
        userId,
        approved: response.approved,
      },
    },
    async () => {
      const supabase = await requireSupabaseClient();
      const status = response.approved ? "approved" : "rejected";

      const { error } = await supabase
        .from("tool_approvals")
        .update({
          status,
          decision_reason: response.reason,
          decision_metadata: response.metadata || {},
          responded_at: new Date().toISOString(),
        })
        .eq("id", approvalId)
        .eq("user_id", userId)
        .eq("status", "pending");

      if (error) throw new Error(`Failed to respond to approval: ${error.message}`);

      await supabase.from("tool_approval_audit").insert({
        approval_id: approvalId,
        event_type: status,
        user_agent: metadata?.userAgent,
        ip_address: metadata?.ipAddress,
        metadata: { reason: response.reason ?? null },
      });
    },
  );
}

/**
 * Wait for approval with timeout (polling-based)
 * Note: For real-time updates, use Supabase Realtime subscription on client
 */
export async function waitForApproval(
  approvalId: string,
  userId: string,
  pollIntervalMs: number = POLL_INTERVAL_MS,
): Promise<ApprovalResponse> {
  const startTime = Date.now();

  while (true) {
    const status = await getApprovalStatus(approvalId, userId);

    if (status === "approved") {
      return { approved: true };
    }

    if (status === "rejected") {
      const supabase = await requireSupabaseClient();
      const { data } = await supabase
        .from("tool_approvals")
        .select("decision_reason")
        .eq("id", approvalId)
        .single();

      return {
        approved: false,
        reason: data?.decision_reason || "User rejected the operation",
      };
    }

    if (status === "expired") {
      return {
        approved: false,
        reason: "Approval request timed out",
      };
    }

    if (status === "cancelled") {
      return {
        approved: false,
        reason: "Approval request was cancelled",
      };
    }

    // Prevent infinite loop
    if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
      throw new Error("Approval wait exceeded maximum duration (2 minutes)");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

/**
 * Auto-approve and log (for autonomous mode)
 */
export async function autoApproveRequest(
  userId: string,
  payload: ApprovalPayload,
  metadata?: { ipAddress?: string; userAgent?: string; sessionId?: string },
): Promise<string> {
  return observeServerOperation(
    {
      domain: APPROVALS_DOMAIN,
      operation: "auto_approve",
      budgetMs: 1500,
      context: {
        userId,
        toolId: payload.toolId,
      },
    },
    async () => {
      const supabase = await requireSupabaseClient();

      const { data, error } = await supabase
        .from("tool_approvals")
        .insert({
          user_id: userId,
          tool_id: payload.toolId,
          command: payload.command,
          payload: payload.args,
          preview: payload.preview,
          status: "auto_approved",
          requested_at: new Date().toISOString(),
          responded_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 60000).toISOString(),
          ip_address: metadata?.ipAddress,
          user_agent: metadata?.userAgent,
          session_id: metadata?.sessionId,
        })
        .select("id")
        .single();

      if (error) throw new Error(`Failed to log auto-approval: ${error.message}`);

      await supabase.from("tool_approval_audit").insert({
        approval_id: data.id,
        event_type: "auto_approved",
        user_agent: metadata?.userAgent,
        ip_address: metadata?.ipAddress,
        metadata: { autonomous_mode: true },
      });

      return data.id;
    },
  );
}

/**
 * Manually expire old approvals (if pg_cron not available)
 */
export async function expireOldApprovals(): Promise<number> {
  const supabase = await requireSupabaseClient();

  const { data, error } = await supabase.rpc("expire_old_approvals");

  if (error) throw new Error(`Failed to expire approvals: ${error.message}`);

  return data || 0;
}

/**
 * Get approval statistics for user
 */
export async function getApprovalStats(
  userId: string,
  since?: Date,
): Promise<{
  total: number;
  approved: number;
  rejected: number;
  expired: number;
  cancelled: number;
  autoApproved: number;
  pending: number;
}> {
  return observeServerOperation(
    {
      domain: APPROVALS_DOMAIN,
      operation: "get_stats",
      budgetMs: 1500,
      context: {
        userId,
        since: since?.toISOString() ?? null,
      },
    },
    async () => {
      const supabase = await requireSupabaseClient();

      let query = supabase.from("tool_approvals").select("status").eq("user_id", userId);

      if (since) {
        query = query.gte("requested_at", since.toISOString());
      }

      const { data, error } = await query;

      if (error) throw new Error(`Failed to get approval stats: ${error.message}`);

      const stats = {
        total: data.length,
        approved: 0,
        rejected: 0,
        expired: 0,
        cancelled: 0,
        autoApproved: 0,
        pending: 0,
      };

      for (const record of data) {
        switch (record.status) {
          case "approved":
            stats.approved++;
            break;
          case "rejected":
            stats.rejected++;
            break;
          case "expired":
            stats.expired++;
            break;
          case "cancelled":
            stats.cancelled++;
            break;
          case "auto_approved":
            stats.autoApproved++;
            break;
          case "pending":
            stats.pending++;
            break;
        }
      }

      return stats;
    },
  );
}
