import { resolveCreditCost, resolveChatRateLimit } from "@/lib/constants/billing-limits";
import {
  createCompositeRateLimitKey,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import {
  NEX_MODELS,
  resolveModelKey,
  type NexModelKey,
  type NexModelTier,
} from "@/lib/ai/nex-models";
import { CHATBOT_MODEL } from "@/modules/ai/chatbot/constants";
import { getCreditBalance, type CreditBalance } from "@/server/services/credits/credit-service";

import {
  ModelAccessRestrictedError,
  RateLimitExceededError,
} from "./errors";

const chatBuckets = new Map<string, { count: number; reset: number }>();
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  orchestrator: "nex-t1-pro",
  "nex-orchestrator": "nex-t1-pro",
};

export function resolveModelKeyFromInput(model: string): string {
  const normalizedModel = LEGACY_MODEL_ALIASES[model] ?? model;
  return resolveModelKey(normalizedModel) ?? normalizedModel;
}

export function isModelAllowedForPlan(model: string, plan: string | null | undefined): boolean {
  const modelKey = resolveModelKeyFromInput(model);
  if (!Object.prototype.hasOwnProperty.call(NEX_MODELS, modelKey)) {
    return true;
  }

  const rawPlan = (plan ?? "free").toLowerCase();
  const normalizedPlan: NexModelTier =
    rawPlan === "pro" ||
    rawPlan === "trader" ||
    rawPlan === "ultra" ||
    rawPlan === "enterprise"
      ? rawPlan
      : "free";

  return NEX_MODELS[modelKey as NexModelKey].tiers.includes(normalizedPlan);
}

export function resolveRequestedModel(
  requestedModel: string | undefined,
  plan: string | null | undefined,
): string {
  if (requestedModel && requestedModel.trim().length > 0) {
    const normalizedModel = LEGACY_MODEL_ALIASES[requestedModel] ?? requestedModel;
    return resolveModelKey(normalizedModel) ?? normalizedModel;
  }

  if (isModelAllowedForPlan(CHATBOT_MODEL, plan)) {
    return resolveModelKey(CHATBOT_MODEL) ?? CHATBOT_MODEL;
  }

  return "nex-t1-free";
}

export async function enforceModelAccess(
  userId: string,
  model: string,
  prefetchedBalance?: CreditBalance,
): Promise<void> {
  const modelKey = resolveModelKey(model);
  if (!modelKey) {
    return;
  }

  const config = NEX_MODELS[modelKey];
  if (!config?.tiers || config.tiers.length === 0) {
    return;
  }

  const balance = prefetchedBalance ?? (await getCreditBalance(userId));
  const userPlan = balance.plan;

  if (!config.tiers.includes(userPlan as NexModelTier)) {
    throw new ModelAccessRestrictedError(
      `Your current plan (${userPlan}) does not support the model '${config.label}'. Please upgrade to access this feature.`,
    );
  }
}

export async function enforceCreditGuardrails(
  userId: string,
  model: string,
  prefetchedBalance?: CreditBalance,
): Promise<void> {
  if (process.env.NODE_ENV === "test" || process.env.E2E_TEST_MODE === "true") {
    return;
  }

  const modelKey = resolveModelKeyFromInput(model);
  const debit = resolveCreditCost(modelKey);
  const balance = prefetchedBalance ?? (await getCreditBalance(userId));

  if (balance.remaining < debit) {
    throw new RateLimitExceededError(60, 402);
  }
}

export function enforceChatRateLimit(identifier: string, tier?: string | null): void {
  const { windowMs, maxRequests } = resolveChatRateLimit(tier);
  const now = Date.now();
  const bucket = chatBuckets.get(identifier);

  if (!bucket || bucket.reset <= now) {
    chatBuckets.set(identifier, { count: 1, reset: now + windowMs });
    return;
  }

  if (bucket.count >= maxRequests) {
    const retryAfter = Math.ceil((bucket.reset - now) / 1000);
    throw new RateLimitExceededError(retryAfter, 429);
  }

  bucket.count += 1;
  chatBuckets.set(identifier, bucket);
}

export async function enforceServerActionRateLimit(params: {
  userId: string | null;
  orgId: string | null;
  route: string;
  prefix: string;
}): Promise<void> {
  const identifier = createCompositeRateLimitKey({
    clientIP: "server-action",
    route: params.route,
    userId: params.userId ?? null,
    orgId: params.orgId ?? undefined,
    prefix: params.prefix,
  });

  const result = await handleRequestRateLimitWithKey(identifier);
  if (!result.success) {
    throw new RateLimitExceededError(result.errorResponse.retryAfter, result.errorResponse.status);
  }
}
