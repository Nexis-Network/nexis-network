import type { ChatAgentRequest } from "@/modules/chat/types";
import { calculateCost } from "@/modules/ai/cost-monitor";
import {
  isCodeInterpreterToolId,
  isSandboxToolId,
  isTerminalToolId,
} from "@/lib/billing/feature-access";

const CHARS_PER_TOKEN = 4;
const USD_PER_CREDIT = 0.04;
const SANDBOX_SURCHARGE_CREDITS = 2;
const TERMINAL_SURCHARGE_CREDITS = 1;
const CODE_INTERPRETER_SURCHARGE_CREDITS = 2;
const MEV_PROTECTION_SURCHARGE_CREDITS = 1;

type WeightedCreditChargeArgs = {
  baseCredits: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  mevProtection?: boolean;
  modelId: string;
  toolNames?: readonly string[];
};

export type WeightedCreditCharge = {
  baseCredits: number;
  tokenCredits: number;
  featureCredits: number;
  totalCredits: number;
  estimatedCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedInputTokens: number;
  toolNames: string[];
  breakdown: {
    sandbox: number;
    terminal: number;
    codeInterpreter: number;
    mevProtection: number;
  };
};

function sanitizeTokenCount(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value ?? 0) : 0;
}

function estimateTokensFromUnknown(value: UntypedJson): number {
  if (value == null) return 0;

  if (typeof value === "string") {
    return Math.ceil(value.length / CHARS_PER_TOKEN);
  }

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + estimateTokensFromUnknown(item), 0);
  }

  if (typeof value === "object") {
    let serialized = "";
    try {
      serialized = JSON.stringify(value);
    } catch {
      serialized = String(value);
    }
    return Math.ceil(serialized.length / CHARS_PER_TOKEN);
  }

  return Math.ceil(String(value).length / CHARS_PER_TOKEN);
}

export function estimateRequestInputTokens(request: ChatAgentRequest): number {
  const messageTokens = request.messages.reduce((total, message) => {
    return total + estimateTokensFromUnknown(message.content);
  }, 0);

  return (
    messageTokens +
    estimateTokensFromUnknown(request.attachmentContext) +
    estimateTokensFromUnknown(request.marketContext) +
    estimateTokensFromUnknown(request.walletContext)
  );
}

export function calculateWeightedCreditCharge({
  baseCredits,
  inputTokens,
  outputTokens,
  reasoningTokens,
  cachedInputTokens,
  mevProtection,
  modelId,
  toolNames = [],
}: WeightedCreditChargeArgs): WeightedCreditCharge {
  const safeInputTokens = sanitizeTokenCount(inputTokens);
  const safeOutputTokens = sanitizeTokenCount(outputTokens);
  const safeReasoningTokens = sanitizeTokenCount(reasoningTokens);
  const safeCachedInputTokens = sanitizeTokenCount(cachedInputTokens);
  const normalizedToolNames = Array.from(
    new Set(toolNames.filter((toolName) => typeof toolName === "string" && toolName.length > 0)),
  );

  const estimatedCostUsd = calculateCost(
    {
      inputTokens: safeInputTokens,
      outputTokens: safeOutputTokens,
      reasoningTokens: safeReasoningTokens,
      cachedInputTokens: safeCachedInputTokens,
      totalTokens: safeInputTokens + safeOutputTokens,
    },
    {
      modelId,
      serviceTier: "auto",
      usesPromptCaching: safeCachedInputTokens > 0,
    },
  ).totalCost;

  const tokenCredits = Math.max(
    baseCredits,
    Math.ceil(estimatedCostUsd / USD_PER_CREDIT),
  );

  const sandbox = normalizedToolNames.some((toolName) => isSandboxToolId(toolName))
    ? SANDBOX_SURCHARGE_CREDITS
    : 0;
  const terminal = normalizedToolNames.some((toolName) => isTerminalToolId(toolName))
    ? TERMINAL_SURCHARGE_CREDITS
    : 0;
  const codeInterpreter = normalizedToolNames.some((toolName) =>
    isCodeInterpreterToolId(toolName),
  )
    ? CODE_INTERPRETER_SURCHARGE_CREDITS
    : 0;
  const mevProtectionSurcharge = mevProtection
    ? MEV_PROTECTION_SURCHARGE_CREDITS
    : 0;

  const featureCredits =
    sandbox + terminal + codeInterpreter + mevProtectionSurcharge;

  return {
    baseCredits,
    tokenCredits,
    featureCredits,
    totalCredits: tokenCredits + featureCredits,
    estimatedCostUsd,
    inputTokens: safeInputTokens,
    outputTokens: safeOutputTokens,
    reasoningTokens: safeReasoningTokens,
    cachedInputTokens: safeCachedInputTokens,
    toolNames: normalizedToolNames,
    breakdown: {
      sandbox,
      terminal,
      codeInterpreter,
      mevProtection: mevProtectionSurcharge,
    },
  };
}
