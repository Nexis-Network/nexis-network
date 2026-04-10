import {
  fetchBedrockContext,
  storeBedrockLongTermMemory,
} from "./unified-memory-provider.bedrock";
import { formatMemoryContextForPrompt } from "./unified-memory-provider.format";
import {
  groupEntriesByType,
  type BackendResult,
} from "./unified-memory-provider.grouping";
import {
  fetchMem0Context,
  storeMem0Memory,
} from "./unified-memory-provider.mem0";
import {
  fetchRedisContext,
  storeShortTermRedisMemory,
} from "./unified-memory-provider.redis";
import type {
  MemoryContext,
  MemorySource,
  UnifiedMemoryBackendState,
  UnifiedMemoryEntry,
} from "./unified-memory-provider.types";

type MemoryWriteType = "short_term" | "long_term" | "personalization";

export async function getUnifiedMemoryContext(
  state: UnifiedMemoryBackendState,
  userId: string,
  query: string,
): Promise<MemoryContext> {
  const startTime = Date.now();
  const results = await Promise.allSettled([
    fetchBackendContext(state, "redis", () =>
      fetchRedisContext({
        redisClient: state.redisClient,
        userId,
        maxEntries: state.config.maxEntriesPerSource,
      }),
    ),
    fetchBackendContext(state, "mem0", () =>
      fetchMem0Context({
        mem0Functions: state.mem0Functions,
        userId,
        query,
        maxEntries: state.config.maxEntriesPerSource,
      }),
    ),
    fetchBackendContext(state, "bedrock", () =>
      fetchBedrockContext({
        bedrockClient: state.bedrockClient,
        userId,
        query,
        maxEntries: state.config.maxEntriesPerSource,
      }),
    ),
  ]);

  const grouped = groupEntriesByType(
    results
      .filter(isFulfilledBackendResult)
      .map((result) => result.value)
      .filter((result): result is BackendResult => result !== null),
  );

  return {
    ...grouped,
    formatted: formatMemoryContextForPrompt(grouped),
    latencyMs: Date.now() - startTime,
  };
}

export async function storeUnifiedMemoryEntry(
  state: UnifiedMemoryBackendState,
  userId: string,
  content: string,
  type: MemoryWriteType,
  metadata?: Record<string, UntypedJson>,
): Promise<{ success: boolean; sources: MemorySource[] }> {
  const storedTo: MemorySource[] = [];

  if (
    type === "short_term" &&
    state.redisClient &&
    (await storeShortTermRedisMemory({
      redisClient: state.redisClient,
      userId,
      content,
      metadata,
      ttlSeconds: state.config.shortTermTtlSeconds,
      maxEntries: state.config.maxEntriesPerSource,
    }))
  ) {
    storedTo.push("redis");
  }

  if (
    (type === "personalization" || type === "long_term") &&
    (await storeMem0Memory({
      mem0Functions: state.mem0Functions,
      userId,
      content,
      type,
      metadata,
    }))
  ) {
    storedTo.push("mem0");
  }

  if (
    type === "long_term" &&
    (await storeBedrockLongTermMemory({
      bedrockClient: state.bedrockClient,
      userId,
      content,
      metadata,
    }))
  ) {
    storedTo.push("bedrock");
  }

  return {
    success: storedTo.length > 0,
    sources: storedTo,
  };
}

async function fetchBackendContext(
  state: UnifiedMemoryBackendState,
  source: MemorySource,
  fetcher: () => Promise<UnifiedMemoryEntry[]>,
): Promise<BackendResult | null> {
  if (
    (source === "redis" && !state.redisClient) ||
    (source === "mem0" && !state.mem0Functions) ||
    (source === "bedrock" && !state.bedrockClient)
  ) {
    return null;
  }

  return {
    source,
    entries: await fetcher(),
  };
}

function isFulfilledBackendResult(
  result: PromiseSettledResult<BackendResult | null>,
): result is PromiseFulfilledResult<BackendResult | null> {
  return result.status === "fulfilled";
}
