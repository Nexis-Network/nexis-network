import { createHash } from "crypto";

import type { Tool } from "ai";

import { isRedisExternalConfigured, redis } from "@/server/services/redis";
import { createCached } from "@/server/services/redis/cache-managers/ai-sdk-cache";

type ToolMap = Record<string, Tool>;
type ExecutableTool = Tool & {
  execute: NonNullable<Tool["execute"]>;
};

type ApplyToolCachePolicyParams = {
  tools: ToolMap;
  modelId: string;
  userId?: string | null;
  sessionId?: string | null;
  emitEvent?: (type: string, data: UntypedJson) => void;
};

const parseBooleanFlag = (value: string | undefined, defaultValue: boolean): boolean => {
  if (typeof value !== "string") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
};

const TOOL_CACHE_ENABLED = parseBooleanFlag(
  process.env.AI_SDK_V6_TOOL_CACHE_ENABLED,
  true,
);

const TOOL_CACHE_TTL_MS = (() => {
  const parsed = Number(process.env.AI_SDK_V6_TOOL_CACHE_TTL_MS ?? 120000);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 120000;
  }
  return Math.min(parsed, 30 * 60 * 1000);
})();

const CACHE_CONTRACT_VERSION =
  process.env.AI_SDK_V6_CACHE_CONTRACT_VERSION?.trim() || "2026-03-05";

const READ_ONLY_PATTERNS = [
  /^get[_-]/i,
  /^list[_-]/i,
  /^search[_-]/i,
  /^fetch[_-]/i,
  /^read[_-]/i,
  /^query[_-]/i,
  /^lookup[_-]/i,
  /^scan[_-]/i,
  /^analyze[_-]/i,
  /^web[_-]?search/i,
  /^news[_-]/i,
  /^price[_-]/i,
  /^market[_-]/i,
  /^coingecko[_-]/i,
  /^pyth[_-]/i,
  /^polymarket[_-]/i,
] as const;

const NON_CACHEABLE_PATTERNS = [
  /^e2b_/i,
  /^terminal_/i,
  /^sandbox_/i,
  /^execute[_-]/i,
  /^create[_-]/i,
  /^update[_-]/i,
  /^delete[_-]/i,
  /^send[_-]/i,
  /^swap[_-]/i,
  /^trade[_-]/i,
  /^transfer[_-]/i,
  /^mint[_-]/i,
  /^burn[_-]/i,
  /^deploy[_-]/i,
  /^wallet_/i,
  /^approval_/i,
  /^auth_/i,
] as const;

const hashValue = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const stableStringify = (value: UntypedJson): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, UntypedJson>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const normalized = entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
  return `{${normalized.join(",")}}`;
};

export function getToolSchemaDigest(tool: Tool): string {
  const candidate = tool as Record<string, UntypedJson>;
  const schema = candidate.inputSchema ?? candidate.parameters ?? null;
  if (!schema || typeof schema !== "object") {
    return "noschema";
  }

  const schemaString = stableStringify(schema);
  return hashValue(schemaString).slice(0, 16);
}

let cachedToolFactory:
  | ReturnType<typeof createCached>
  | null = null;

function getCachedToolFactory(): ReturnType<typeof createCached> {
  if (!cachedToolFactory) {
    cachedToolFactory = createCached({
      cache: isRedisExternalConfigured ? redis : undefined,
      keyPrefix: "chat:tool-cache:",
      ttl: TOOL_CACHE_TTL_MS,
    });
  }

  return cachedToolFactory;
}

export function shouldCacheToolByName(toolName: string): boolean {
  if (!toolName) return false;
  if (NON_CACHEABLE_PATTERNS.some((pattern) => pattern.test(toolName))) {
    return false;
  }
  return READ_ONLY_PATTERNS.some((pattern) => pattern.test(toolName));
}

export function buildToolCacheScope(params: {
  modelId: string;
  userId?: string | null;
  sessionId?: string | null;
}) {
  const userScopeHash = hashValue(params.userId ?? "anon").slice(0, 16);
  const sessionScopeHash = hashValue(params.sessionId ?? "global").slice(0, 16);

  return [
    `v:${CACHE_CONTRACT_VERSION}`,
    `m:${params.modelId}`,
    `u:${userScopeHash}`,
    `s:${sessionScopeHash}`,
  ].join("|");
}

export function applyToolCachePolicy({
  tools,
  modelId,
  userId,
  sessionId,
  emitEvent,
}: ApplyToolCachePolicyParams): ToolMap {
  if (!TOOL_CACHE_ENABLED) {
    return tools;
  }

  const wrappedTools: ToolMap = {};
  const cacheTool = getCachedToolFactory();
  const cacheScope = buildToolCacheScope({ modelId, userId, sessionId });

  for (const [toolName, tool] of Object.entries(tools)) {
    if (!tool?.execute || !shouldCacheToolByName(toolName)) {
      wrappedTools[toolName] = tool;
      continue;
    }

    const executableTool = tool as ExecutableTool;
    const schemaDigest = getToolSchemaDigest(executableTool);

    wrappedTools[toolName] = cacheTool(executableTool, {
      cacheKey: () => cacheScope,
      keyGenerator: (params, context) => {
        const serialized = stableStringify(params as UntypedJson);
        const payloadHash = hashValue(`${toolName}:${serialized}`).slice(0, 32);
        return `${toolName}:${context ?? cacheScope}:${schemaDigest}:${payloadHash}`;
      },
      onHit: () => {
        emitEvent?.("cache", {
          status: "tool-hit",
          key: `${toolName}:${cacheScope}:${schemaDigest}`,
          toolName,
          schemaDigest,
        });
      },
      onMiss: () => {
        emitEvent?.("cache", {
          status: "tool-miss",
          key: `${toolName}:${cacheScope}:${schemaDigest}`,
          toolName,
          schemaDigest,
        });
      },
    });
  }

  return wrappedTools;
}
