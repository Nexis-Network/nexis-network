import type { IntentClassification } from "@/modules/chat/intent-classifier";
import { INTENT_TOOL_MAP } from "@/modules/chat/intent-classifier";
import { filterLoadableToolIds } from "@/modules/ai/chatbot/toolset";
import { getSkillsForIntent } from "@/modules/ai/skills/skill-loader";
import { getExpectedAiSdkMcpToolIds } from "@/server/mcp/ai-sdk-mcp-tools";
import {
  filterPlanRestrictedToolIds,
  hasPaidFeatureAccess,
} from "@/lib/billing/feature-access";

import {
  AI_SDK_V6_E2B_ARTIFACT_TOOL_IDS,
  AI_SDK_V6_MCP_RUNTIME_INTENT_CATEGORIES,
  type StandardizedRuntimeCapabilityFlags,
} from "./runtime-capabilities";
import {
  isMorphNexCodeModel,
  shouldEnableArtifactCodingParity,
} from "./morph-routing";

export type ChatPipelineRuntimePlan = {
  runtime: "standardized_ai_sdk_v6";
  shouldLoadMcpTools: boolean;
  mcpPurpose: "chat_readonly" | "agent_runtime";
  allowValueMovingMcpTools: boolean;
  isNexCodeModel: boolean;
  enableArtifactParity: boolean;
  toolIdsToLoad: string[];
  expectedMcpToolIds: string[];
  promptScopedToolIds: string[];
  requiredSkills: string[];
  capabilities: StandardizedRuntimeCapabilityFlags;
  telemetry: {
    runtime: "standardized_ai_sdk_v6";
    shouldLoadMcpTools: boolean;
    mcpPurpose: "chat_readonly" | "agent_runtime";
    allowValueMovingMcpTools: boolean;
    isNexCodeModel: boolean;
    enableArtifactParity: boolean;
    toolCount: number;
    promptToolCount: number;
    skillCount: number;
    enabledMcpServerCount: number;
  };
};

function dedupe(items: readonly string[]): string[] {
  return Array.from(new Set(items));
}

function resolveMcpRuntimeMode(args: {
  shouldLoadMcpTools: boolean;
  requiresApproval: boolean;
  userPlan: string | null | undefined;
}): {
  mcpPurpose: "chat_readonly" | "agent_runtime";
  allowValueMovingMcpTools: boolean;
} {
  if (!args.shouldLoadMcpTools) {
    return {
      mcpPurpose: "chat_readonly",
      allowValueMovingMcpTools: false,
    };
  }

  const allowValueMovingMcpTools =
    args.requiresApproval && hasPaidFeatureAccess(args.userPlan);

  return {
    mcpPurpose: allowValueMovingMcpTools ? "agent_runtime" : "chat_readonly",
    allowValueMovingMcpTools,
  };
}

const DIRECT_TOOL_REQUEST_PATTERNS: Array<{
  pattern: RegExp;
  toolIds: string[];
}> = [
  { pattern: /\bagent_wallet_list\b/i, toolIds: ["agent_wallet_list"] },
  { pattern: /\bwallet_get_holdings\b/i, toolIds: ["wallet_get_holdings"] },
  { pattern: /\bwallet_get_history\b/i, toolIds: ["wallet_get_history"] },
  { pattern: /\bwallet_get_nfts\b/i, toolIds: ["wallet_get_nfts"] },
  { pattern: /\bwallet_get_pnl\b/i, toolIds: ["wallet_get_pnl"] },
  { pattern: /\bwallet_get_transfers\b/i, toolIds: ["wallet_get_transfers"] },
  { pattern: /\bwallet_get_net_worth\b/i, toolIds: ["wallet_get_net_worth"] },
];

function inferToolIdsFromLatestUserMessage(
  latestUserMessage: string | null | undefined,
): string[] {
  const normalizedMessage = (latestUserMessage ?? "").trim().toLowerCase();
  if (!normalizedMessage) {
    return [];
  }

  const inferred = new Set<string>();

  for (const entry of DIRECT_TOOL_REQUEST_PATTERNS) {
    if (entry.pattern.test(normalizedMessage)) {
      for (const toolId of entry.toolIds) {
        inferred.add(toolId);
      }
    }
  }

  if (/\bembedded\s+wallets?\b/i.test(normalizedMessage)) {
    inferred.add("agent_wallet_list");
  }

  return Array.from(inferred);
}

function inferFocusedWalletToolIds(
  latestUserMessage: string | null | undefined,
): string[] {
  const normalizedMessage = (latestUserMessage ?? "").trim().toLowerCase();
  if (!normalizedMessage) {
    return [];
  }

  if (/\b(send|transfer)\b/i.test(normalizedMessage)) {
    const isEvmTransfer =
      /\b(eth|ethereum|base|arbitrum|optimism|polygon|wallet)\b/i.test(
        normalizedMessage,
      ) || /0x[a-f0-9]{40}/i.test(normalizedMessage);
    const isSolanaTransfer = /\b(sol|solana|jupiter)\b/i.test(normalizedMessage);
    const isBitcoinTransfer = /\b(btc|bitcoin|lightning)\b/i.test(
      normalizedMessage,
    );

    return [
      "agent_wallet_list",
      ...(isEvmTransfer
        ? ["cdp_wallet_send", "evm_wallet_send_asset"]
        : []),
      ...(isSolanaTransfer ? ["helius_solana"] : []),
      ...(isBitcoinTransfer ? ["bitcoin_network"] : []),
      ...(!isEvmTransfer && !isSolanaTransfer && !isBitcoinTransfer
        ? ["evm_wallet", "bitcoin_network", "helius_solana"]
        : []),
      "help_create_wallet",
    ];
  }

  if (/\bswap\b/i.test(normalizedMessage)) {
    return [
      "agent_wallet_list",
      "cdp_wallet_swap",
      "cdp_wallet_balance",
      "evm_wallet",
      "helius_solana",
      "dexscreener",
      "uniswap_poolspy",
      "help_create_wallet",
    ];
  }

  return [];
}

export async function buildChatPipelineRuntimePlan(args: {
  classification: IntentClassification;
  latestUserMessage?: string | null;
  requestedModelAlias?: string | null;
  userId?: string | null;
  userPlan?: string | null;
  enabledMcpServers?: { name: string }[];
}): Promise<ChatPipelineRuntimePlan> {
  const {
    classification,
    latestUserMessage,
    requestedModelAlias,
    userId,
    userPlan,
    enabledMcpServers = [],
  } = args;

  const normalizedModelAlias = (requestedModelAlias ?? "").toLowerCase();
  const isNexCodeModel = isMorphNexCodeModel(normalizedModelAlias);
  const enableArtifactParity = shouldEnableArtifactCodingParity(normalizedModelAlias);
  const shouldLoadMcpTools = AI_SDK_V6_MCP_RUNTIME_INTENT_CATEGORIES.has(
    classification.category,
  );
  const { mcpPurpose, allowValueMovingMcpTools } = resolveMcpRuntimeMode({
    shouldLoadMcpTools,
    requiresApproval: classification.requiresApproval,
    userPlan,
  });
  const explicitToolIds = inferToolIdsFromLatestUserMessage(latestUserMessage);
  const focusedWalletToolIds =
    classification.category === "wallet_action"
      ? inferFocusedWalletToolIds(latestUserMessage)
      : [];

  const unrestrictedToolIds = dedupe(
    focusedWalletToolIds.length > 0
      ? [
          ...focusedWalletToolIds,
          ...explicitToolIds,
          ...(enableArtifactParity ? AI_SDK_V6_E2B_ARTIFACT_TOOL_IDS : []),
        ]
      : [
          ...(INTENT_TOOL_MAP.general ?? []),
          ...(INTENT_TOOL_MAP[classification.category] ?? []),
          ...explicitToolIds,
          ...(enableArtifactParity ? AI_SDK_V6_E2B_ARTIFACT_TOOL_IDS : []),
        ],
  );
  const toolIdsToLoad = await filterLoadableToolIds(
    filterPlanRestrictedToolIds(unrestrictedToolIds, userPlan),
  );

  const unrestrictedMcpToolIds = shouldLoadMcpTools
    ? await getExpectedAiSdkMcpToolIds({
        purpose: mcpPurpose,
        allowValueMoving: allowValueMovingMcpTools,
        userId: userId ?? null,
      })
    : [];
  const expectedMcpToolIds = filterPlanRestrictedToolIds(
    unrestrictedMcpToolIds,
    userPlan,
  );

  const promptScopedToolIds = dedupe([
    ...toolIdsToLoad,
    ...expectedMcpToolIds,
  ]);

  const requiredSkills =
    focusedWalletToolIds.length > 0 || classification.fastPathEligible
    ? []
    : getSkillsForIntent(classification.category);

  const capabilities: StandardizedRuntimeCapabilityFlags = {
    artifacts: promptScopedToolIds.includes("emit_artifact"),
    e2bSandbox: promptScopedToolIds.some((toolId) => toolId.startsWith("e2b_")),
    e2bTerminal: promptScopedToolIds.some((toolId) =>
      ["e2b_npm_install", "e2b_npm_run"].includes(toolId),
    ),
    codeInterpreter: promptScopedToolIds.some((toolId) =>
      ["e2b_code_interpreter", "openai_code_interpreter"].includes(toolId),
    ),
    mcpTools: shouldLoadMcpTools || expectedMcpToolIds.length > 0 || enabledMcpServers.length > 0,
    skills: requiredSkills.length > 0,
    langfusePrompts: true,
  };

  return {
    runtime: "standardized_ai_sdk_v6",
    shouldLoadMcpTools,
    mcpPurpose,
    allowValueMovingMcpTools,
    isNexCodeModel,
    enableArtifactParity,
    toolIdsToLoad,
    expectedMcpToolIds,
    promptScopedToolIds,
    requiredSkills,
    capabilities,
    telemetry: {
      runtime: "standardized_ai_sdk_v6",
      shouldLoadMcpTools,
      mcpPurpose,
      allowValueMovingMcpTools,
      isNexCodeModel,
      enableArtifactParity,
      toolCount: toolIdsToLoad.length,
      promptToolCount: promptScopedToolIds.length,
      skillCount: requiredSkills.length,
      enabledMcpServerCount: enabledMcpServers.length,
    },
  };
}
