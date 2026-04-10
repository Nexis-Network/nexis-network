import "server-only";

import crypto from "crypto";

import { createGateway, generateText, type ToolSet } from "ai";

import { getToolRiskLevel } from "@/modules/ai/tool-risk-registry";
import { loadToolsByIds } from "@/modules/ai/chatbot/toolset";
import { resolveChatProviderModel } from "@/modules/chat/pipeline/provider-model";
import {
  directOpenai,
  directOpenaiConfig,
  hasUsableOpenAIApiKey,
} from "@/server/services/ai-sdk/openai";
import { calculateDeveloperApiBill } from "@/server/services/developer-api/billing";
import { buildPublicSystemPrompt } from "@/server/services/developer-api/prompt-baselines";
import { getPublicProduct } from "@/server/services/developer-api/product-registry";
import { insertApiRequestLog } from "@/server/services/developer-api/repository";
import { hasPublicToolCostClass } from "@/server/services/developer-api/tool-cost-registry";
import type {
  DeveloperApiAuthContext,
  DeveloperApiRequest,
  PublicDeveloperProductId,
} from "@/server/services/developer-api/types";

const gatewayApiKey =
  process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_AI_GATEWAY_API_KEY ?? "";
const gatewayBaseUrl =
  process.env.AI_GATEWAY_BASE_URL ?? "https://ai-gateway.vercel.sh/v1/ai";

const aiGateway = createGateway({
  apiKey: gatewayApiKey,
  baseURL: gatewayBaseUrl,
});

const hasDirectOpenAI =
  hasUsableOpenAIApiKey(directOpenaiConfig.apiKey);

function buildResponseId(): string {
  return `resp_${crypto.randomUUID().replace(/-/g, "")}`;
}

function sanitizeInput(input: string): string {
  return input.trim();
}

async function resolvePublicTools(
  productId: PublicDeveloperProductId,
  requestTools: DeveloperApiRequest["tools"],
): Promise<ToolSet> {
  if (requestTools?.enabled === false) {
    return {};
  }

  const product = getPublicProduct(productId);
  const allowList = new Set(requestTools?.allow ?? product.toolBaseline);
  const eligibleIds = product.toolBaseline.filter((toolId) => {
    if (!allowList.has(toolId)) {
      return false;
    }

    const risk = getToolRiskLevel(toolId);
    if (risk === "blocked" || risk === "approval_required") {
      return false;
    }

    return hasPublicToolCostClass(toolId);
  });

  return loadToolsByIds(eligibleIds);
}

function extractToolUsage(
  toolCalls: unknown,
  productId: PublicDeveloperProductId,
): Array<{ toolName: string; callCount: number; runtimeMinutes: number }> {
  const defaultRuntimeMinutes = getPublicProduct(productId).defaultRuntimeMinutes;
  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls
    .map((toolCall) => {
      const record = toolCall as Record<string, UntypedJson>;
      const toolName = String(record.toolName ?? record.name ?? "").trim();
      if (!toolName) {
        return null;
      }

      return {
        toolName,
        callCount: 1,
        runtimeMinutes: toolName.startsWith("e2b_") ? defaultRuntimeMinutes : 0,
      };
    })
    .filter(
      (
        entry,
      ): entry is { toolName: string; callCount: number; runtimeMinutes: number } =>
        entry !== null,
    );
}

type ExecuteDeveloperResponseArgs = {
  auth: DeveloperApiAuthContext;
  request: DeveloperApiRequest;
  requestKind?: "responses" | "chat.completions";
};

export async function executeDeveloperResponse({
  auth,
  request,
  requestKind = "responses",
}: ExecuteDeveloperResponseArgs): Promise<{
  response: Record<string, UntypedJson>;
  headers: Record<string, string>;
}> {
  const startedAt = Date.now();
  const product = getPublicProduct(request.model);
  const responseId = buildResponseId();

  try {
    const { canUseDirectOpenAi, providerModelId } = resolveChatProviderModel({
      resolvedModel: product.upstreamModel,
      hasDirectOpenAI,
    });
    const modelProvider = canUseDirectOpenAi ? directOpenai : aiGateway;
    const tools = await resolvePublicTools(request.model, request.tools);
    const system = await buildPublicSystemPrompt({
      productId: request.model,
      instructions: request.instructions,
    });
    const result = await generateText({
      model: modelProvider(providerModelId),
      system,
      prompt: sanitizeInput(request.input),
      maxOutputTokens: request.maxOutputTokens ?? product.defaultMaxOutputTokens,
      ...(typeof request.temperature === "number"
        ? { temperature: request.temperature }
        : {}),
      ...(Object.keys(tools).length > 0 ? { tools } : {}),
    });

    const toolUsage = extractToolUsage(result.toolCalls, request.model);
    const usage = {
      inputTokens: result.usage?.inputTokens ?? 0,
      outputTokens: result.usage?.outputTokens ?? 0,
      reasoningTokens: result.usage?.reasoningTokens ?? 0,
      cachedInputTokens: result.usage?.cachedInputTokens ?? 0,
    };
    const billing = calculateDeveloperApiBill({
      productId: request.model,
      providerModel: product.upstreamModel,
      usage,
      toolCalls: toolUsage,
      billingContext: {
        planId: auth.billingAccount?.plan,
        includedCredits: auth.billingAccount?.includedCredits,
        monthlyCreditsUsed: auth.usageSnapshot.monthlyCreditsUsed,
      },
    });
    const responseLatencyMs = Date.now() - startedAt;

    await insertApiRequestLog({
      requestId: responseId,
      apiKeyId: auth.apiKeyId,
      projectId: auth.projectId,
      ownerType: auth.ownerType,
      ownerId: auth.ownerId,
      billingAccountId: auth.billingAccountId,
      product: request.model,
      upstreamModel: product.upstreamModel,
      provider: product.provider,
      requestKind,
      status: "succeeded",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      reasoningTokens: usage.reasoningTokens,
      cachedInputTokens: usage.cachedInputTokens,
      toolNames: toolUsage.map((entry) => entry.toolName),
      providerTokenCostUsd: billing.providerTokenCostUsd,
      toolCostUsd: billing.toolCostUsd,
      runtimeCostUsd: billing.runtimeCostUsd,
      totalCostUsd: billing.totalCostUsd,
      billedCredits: billing.billedCredits,
      responseLatencyMs,
      metadata: request.metadata,
    });

    return {
      response: {
        id: responseId,
        object: "response",
        created: Math.floor(startedAt / 1_000),
        model: request.model,
        output: [
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: result.text,
              },
            ],
          },
        ],
        usage: {
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.inputTokens + usage.outputTokens,
          reasoning_tokens: usage.reasoningTokens,
          cached_input_tokens: usage.cachedInputTokens,
        },
        developer_api: {
          product: request.model,
          upstream_model: product.upstreamModel,
          billed_credits: billing.billedCredits,
          total_cost_usd: billing.totalCostUsd,
          tool_names: toolUsage.map((entry) => entry.toolName),
        },
      },
      headers: {
        "X-Nex-Credits-Billed": billing.billedCredits.toString(),
        "X-Nex-Product": request.model,
        "X-Nex-Project-Id": auth.projectId,
      },
    };
  } catch (error) {
    const responseLatencyMs = Date.now() - startedAt;
    await insertApiRequestLog({
      requestId: responseId,
      apiKeyId: auth.apiKeyId,
      projectId: auth.projectId,
      ownerType: auth.ownerType,
      ownerId: auth.ownerId,
      billingAccountId: auth.billingAccountId,
      product: request.model,
      upstreamModel: product.upstreamModel,
      provider: product.provider,
      requestKind,
      status: "failed",
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedInputTokens: 0,
      toolNames: [],
      providerTokenCostUsd: 0,
      toolCostUsd: 0,
      runtimeCostUsd: 0,
      totalCostUsd: 0,
      billedCredits: 0,
      responseLatencyMs,
      errorCode: "UPSTREAM_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      metadata: request.metadata,
    });
    throw error;
  }
}
