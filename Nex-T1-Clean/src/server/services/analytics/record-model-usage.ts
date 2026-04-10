/**
 * AI Model Usage Analytics
 *
 * Records model usage to the `ai_model_usage` table using the
 * `record_ai_model_usage` Postgres function. This is fire-and-forget:
 * failures are logged but never block the chat response.
 */

import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { logger } from "@/lib/logger";
import { resolveModel } from "@/lib/ai/nex-models";

export type ModelUsageRecord = {
  userId: string;
  conversationId?: string | null;
  modelName: string;
  provider: string;
  operationType?: string;
  inputTokens?: number;
  outputTokens?: number;
  responseTimeMs?: number;
  success?: boolean;
  errorMessage?: string | null;
  toolCalls?: unknown[];
  metadata?: Record<string, unknown>;
};

/**
 * Fire-and-forget function that inserts a row into `ai_model_usage`
 * via the `record_ai_model_usage` Postgres function.
 */
export async function recordModelUsage(record: ModelUsageRecord): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase.rpc("record_ai_model_usage", {
      p_user_id: record.userId,
      p_conversation_id: record.conversationId ?? null,
      p_model_name: record.modelName,
      p_provider: record.provider,
      p_operation_type: record.operationType ?? "chat_completion",
      p_input_tokens: record.inputTokens ?? 0,
      p_output_tokens: record.outputTokens ?? 0,
      p_response_time_ms: record.responseTimeMs ?? null,
      p_success: record.success ?? true,
      p_error_message: record.errorMessage ?? null,
      p_tool_calls: JSON.stringify(record.toolCalls ?? []),
      p_metadata: JSON.stringify(record.metadata ?? {}),
    });

    if (error) {
      logger.warn("ai_model_usage_record_failed", {
        userId: record.userId,
        model: record.modelName,
        error: error.message,
      });
    }
  } catch (err) {
    // Never throw from analytics - this is fire-and-forget
    logger.warn("ai_model_usage_record_error", err);
  }
}

/**
 * Derives a provider name from a model string.
 * e.g. "openai/gpt-4o" -> "openai", "anthropic/claude-3.5-sonnet" -> "anthropic"
 */
export function deriveProviderFromModel(model: string): string {
  if (model.includes("/")) {
    return model.split("/")[0];
  }
  const resolved = resolveModel(model);
  if (resolved) return resolved.provider;
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "openai";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("gemini-")) return "google";
  if (model.startsWith("llama") || model.startsWith("deepseek")) return "groq";
  return "unknown";
}
