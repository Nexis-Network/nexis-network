import { resolveModelKey, resolveModel as resolveNexModel } from "@/lib/ai/nex-models";
import { resolveTokenLimit } from "@/lib/constants/billing-limits";

const MIN_INPUT_BUDGET_TOKENS = 512;
const MIN_OUTPUT_HEADROOM_TOKENS = 512;
const STANDARD_OUTPUT_HEADROOM_TOKENS = 1024;
const BUILDER_OUTPUT_HEADROOM_TOKENS = 2048;

export type ChatRuntimeTokenBudget = {
  requestTokenBudget: number | null;
  compactionContextLimit: number;
  outputHeadroomTokens: number;
  maxOutputTokens?: number;
};

function clampPositiveInteger(
  value: number | null | undefined,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return undefined;
  }

  return Math.floor(value);
}

function resolveDesiredOutputBudget(args: {
  explicitMaxOutputTokens?: number;
  modelMaxOutputTokens?: number;
}): number | undefined {
  const explicitBudget = clampPositiveInteger(args.explicitMaxOutputTokens);
  const modelBudget = clampPositiveInteger(args.modelMaxOutputTokens);

  return explicitBudget && modelBudget
    ? Math.min(explicitBudget, modelBudget)
    : explicitBudget;
}

export function resolveChatRuntimeTokenBudget(args: {
  requestedModel: string | null | undefined;
  resolvedModel: string;
  userPlan: string | null | undefined;
  contextLimit: number;
  reservedTokens: number;
  explicitMaxOutputTokens?: number;
  isBuilderTurn: boolean;
}): ChatRuntimeTokenBudget {
  const modelKey = resolveModelKey(args.requestedModel ?? args.resolvedModel);
  const modelConfig = modelKey ? resolveNexModel(modelKey) : undefined;
  const requestTokenBudget = modelKey
    ? resolveTokenLimit(modelKey, args.userPlan)
    : null;
  const compactionContextLimit =
    requestTokenBudget !== null
      ? Math.min(args.contextLimit, requestTokenBudget)
      : args.contextLimit;
  const desiredOutputBudget = resolveDesiredOutputBudget({
    explicitMaxOutputTokens: args.explicitMaxOutputTokens,
    modelMaxOutputTokens: modelConfig?.maxOutputTokens,
  });
  const preferredHeadroom = args.isBuilderTurn
    ? BUILDER_OUTPUT_HEADROOM_TOKENS
    : STANDARD_OUTPUT_HEADROOM_TOKENS;

  if (requestTokenBudget === null) {
    return {
      requestTokenBudget,
      compactionContextLimit,
      outputHeadroomTokens: Math.max(
        MIN_OUTPUT_HEADROOM_TOKENS,
        Math.min(
          desiredOutputBudget ?? preferredHeadroom,
          Math.floor(compactionContextLimit * 0.25),
        ),
      ),
      ...(desiredOutputBudget ? { maxOutputTokens: desiredOutputBudget } : {}),
    };
  }

  const maxHeadroomBudget = Math.max(
    MIN_OUTPUT_HEADROOM_TOKENS,
    compactionContextLimit -
      Math.max(0, args.reservedTokens) -
      MIN_INPUT_BUDGET_TOKENS,
  );
  const outputHeadroomTokens = Math.min(
    desiredOutputBudget ?? preferredHeadroom,
    maxHeadroomBudget,
  );

  return {
    requestTokenBudget,
    compactionContextLimit,
    outputHeadroomTokens,
    ...(desiredOutputBudget ? { maxOutputTokens: desiredOutputBudget } : {}),
  };
}
