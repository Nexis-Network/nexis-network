import "server-only";

import { isRedisInMemoryFallback, redis } from "@/server/services/redis";
import { logger } from "@/lib/logger";

const CANCELLATION_KEY_PREFIX = "chat:execution-cancel:";
const CANCELLATION_TTL_SECONDS = 60 * 60;
const CANCELLATION_POLL_INTERVAL_MS = 250;

type ActiveExecutionEntry = {
  controller: AbortController;
  pollTimer: ReturnType<typeof setInterval> | null;
  pollInFlight: boolean;
  released: boolean;
};

declare global {
  var __nexChatExecutionCancellationRegistry:
    | Map<string, ActiveExecutionEntry>
    | undefined;
}

export type ChatExecutionCancellationHandle = {
  abortSignal: AbortSignal;
  release: () => Promise<void>;
};

function getRegistry(): Map<string, ActiveExecutionEntry> {
  if (!globalThis.__nexChatExecutionCancellationRegistry) {
    globalThis.__nexChatExecutionCancellationRegistry = new Map();
  }

  return globalThis.__nexChatExecutionCancellationRegistry;
}

function normalizeStreamId(streamId: string): string {
  return streamId.trim();
}

function getCancellationKey(streamId: string): string {
  return `${CANCELLATION_KEY_PREFIX}${streamId}`;
}

async function hasCancellationMarker(streamId: string): Promise<boolean> {
  const marker = await redis.get<string>(getCancellationKey(streamId));
  return marker === "1";
}

async function setCancellationMarker(streamId: string): Promise<void> {
  await redis.set(getCancellationKey(streamId), "1", {
    ex: CANCELLATION_TTL_SECONDS,
  });
}

async function clearCancellationMarker(streamId: string): Promise<void> {
  await redis.del(getCancellationKey(streamId));
}

async function syncMarkerToAbort(
  streamId: string,
  entry: ActiveExecutionEntry,
): Promise<void> {
  if (entry.released || entry.pollInFlight || entry.controller.signal.aborted) {
    return;
  }

  entry.pollInFlight = true;
  try {
    if (await hasCancellationMarker(streamId)) {
      entry.controller.abort("chat_execution_cancelled");
    }
  } catch (error) {
    logger.error("[chat-cancel] failed to check cancellation marker", error);
  } finally {
    entry.pollInFlight = false;
  }
}

async function releaseChatExecutionCancellation(streamId: string): Promise<void> {
  const normalizedStreamId = normalizeStreamId(streamId);
  if (!normalizedStreamId) {
    return;
  }

  const registry = getRegistry();
  const entry = registry.get(normalizedStreamId);
  if (!entry) {
    return;
  }

  if (entry.released) {
    return;
  }

  entry.released = true;
  if (entry.pollTimer) {
    clearInterval(entry.pollTimer);
    entry.pollTimer = null;
  }
  registry.delete(normalizedStreamId);

  try {
    await clearCancellationMarker(normalizedStreamId);
  } catch (error) {
    logger.error("[chat-cancel] failed to clear cancellation marker", error);
  }
}

export async function registerChatExecutionCancellation(
  streamId: string,
): Promise<ChatExecutionCancellationHandle | null> {
  const normalizedStreamId = normalizeStreamId(streamId);
  if (!normalizedStreamId) {
    return null;
  }

  const registry = getRegistry();
  if (registry.has(normalizedStreamId)) {
    await releaseChatExecutionCancellation(normalizedStreamId);
  }

  const entry: ActiveExecutionEntry = {
    controller: new AbortController(),
    pollTimer: null,
    pollInFlight: false,
    released: false,
  };

  registry.set(normalizedStreamId, entry);

  try {
    if (await hasCancellationMarker(normalizedStreamId)) {
      entry.controller.abort("chat_execution_cancelled");
    }
  } catch (error) {
    logger.error(
      "[chat-cancel] failed to read initial cancellation marker",
      error,
    );
  }

  entry.pollTimer = setInterval(() => {
    void syncMarkerToAbort(normalizedStreamId, entry);
  }, CANCELLATION_POLL_INTERVAL_MS);

  if (typeof entry.pollTimer.unref === "function") {
    entry.pollTimer.unref();
  }

  return {
    abortSignal: entry.controller.signal,
    release: () => releaseChatExecutionCancellation(normalizedStreamId),
  };
}

export async function cancelChatExecution(streamId: string): Promise<boolean> {
  const normalizedStreamId = normalizeStreamId(streamId);
  if (!normalizedStreamId) {
    return false;
  }

  const entry = getRegistry().get(normalizedStreamId);
  const abortedLocally = Boolean(entry);
  if (isRedisInMemoryFallback && !abortedLocally) {
    logger.warn(
      "[chat-cancel] in-memory redis fallback cannot cancel non-local execution",
      { streamId: normalizedStreamId },
    );
    return false;
  }

  let markerPersisted = false;
  try {
    await setCancellationMarker(normalizedStreamId);
    markerPersisted = true;
  } catch (error) {
    logger.error("[chat-cancel] failed to persist cancellation marker", error);
  }

  if (entry && !entry.controller.signal.aborted) {
    entry.controller.abort("chat_execution_cancelled");
  }

  return markerPersisted || abortedLocally;
}
