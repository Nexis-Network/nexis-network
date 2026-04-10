import type { IntentCategory } from "@/modules/chat/intent-classifier";

/**
 * Models that MUST explicitly disable reasoning for speed.
 */
const DISABLE_REASONING_MODELS = new Set([
  "gpt-5-nano",
  "gpt-4o-mini",
  "gpt-4.1-mini",
]);

/**
 * Models that support reasoning/thinking mode.
 */
const REASONING_ENABLED_MODELS = new Set([
  "gpt-5",
  "gpt-5.4",
  "o1",
  "o1-mini",
  "o1-preview",
]);

/**
 * GPT-5.x models that require reasoningSummary.
 */
const GPT5_REASONING_MODELS = new Set([
  "gpt-5",
  "gpt-5.4",
]);

/**
 * Determines reasoning effort based on model capabilities and intent.
 */
export const getReasoningEffort = (
  modelId: string,
  category: IntentCategory,
): "minimal" | "low" | "medium" | "high" | "none" | undefined => {
  const normalizedModel = modelId.includes("/")
    ? modelId.split("/").pop() ?? modelId
    : modelId;

  if (DISABLE_REASONING_MODELS.has(normalizedModel)) {
    return "none";
  }

  if (!REASONING_ENABLED_MODELS.has(normalizedModel)) {
    return undefined;
  }

  if (normalizedModel === "gpt-5.4" || normalizedModel === "gpt-5") {
    const intentReasoningMap: Record<IntentCategory, "minimal" | "low" | "medium" | "high"> = {
      greeting: "minimal",
      price_check: "low",
      balance_check: "low",
      wallet_action: "low",
      wallet_create: "low",
      trending: "low",
      research: "high",
      analysis: "high",
      complex_task: "high",
      smart_contract: "high",
      market_data: "medium",
      conversation: "low",
      general_question: "low",
      degen_trading: "medium",
      nft: "medium",
      image_generation: "medium",
      trading: "medium",
      defi: "high",
      defi_swap: "medium",
      defi_yield: "high",
      defi_liquidity: "high",
      general: "low",
      task_scheduling: "medium",
      code_generation: "medium",
      document_analysis: "high",
    };

    return intentReasoningMap[category] ?? "medium";
  }

  if (normalizedModel === "o1") {
    return "high";
  }

  return "medium";
};

/**
 * Determines reasoning summary level for GPT-5.x models.
 */
export const getReasoningSummary = (
  modelId: string,
  reasoningEffort: string | undefined,
): "auto" | "concise" | "detailed" | undefined => {
  const normalizedModel = modelId.includes("/")
    ? modelId.split("/").pop() ?? modelId
    : modelId;

  if (!GPT5_REASONING_MODELS.has(normalizedModel)) {
    return undefined;
  }

  if (reasoningEffort === "high") {
    return "detailed";
  }
  if (reasoningEffort === "minimal" || reasoningEffort === "none") {
    return "concise";
  }

  return "auto";
};
