import "server-only";

import { logger } from "@/lib/logger";

import type {
  Mem0Functions,
  UnifiedMemoryEntry,
} from "./unified-memory-provider.types";

export async function loadMem0Functions(): Promise<Mem0Functions | null> {
  try {
    const mem0Module = await import("./mem0-client");
    if (!mem0Module.isMem0Configured()) {
      logger.warn("[UnifiedMemory] Mem0 not configured");
      return null;
    }

    return {
      searchUserMemories: mem0Module.searchUserMemories,
      storeUserMemory: mem0Module.storeUserMemory,
      isMem0Configured: mem0Module.isMem0Configured,
    };
  } catch (error) {
    logger.warn("[UnifiedMemory] Mem0 import failed:", error);
    return null;
  }
}

export async function fetchMem0Context(args: {
  mem0Functions: Mem0Functions | null;
  userId: string;
  query: string;
  maxEntries: number;
}): Promise<UnifiedMemoryEntry[]> {
  const { mem0Functions, userId, query, maxEntries } = args;

  if (!mem0Functions) {
    return [];
  }

  try {
    const results = await mem0Functions.searchUserMemories(
      userId,
      query,
      maxEntries,
    );

    return results.map((result) => ({
      id: result.id,
      type: "long_term" as const,
      content: result.text,
      metadata: result.metadata,
      createdAt: Date.now(),
      source: "mem0" as const,
      score: result.score ?? 0.5,
    }));
  } catch (error) {
    logger.error("[UnifiedMemory] Mem0 fetch failed:", error);
    return [];
  }
}

export async function storeMem0Memory(args: {
  mem0Functions: Mem0Functions | null;
  userId: string;
  content: string;
  type: "personalization" | "long_term";
  metadata?: Record<string, UntypedJson>;
}): Promise<boolean> {
  const { mem0Functions, userId, content, type, metadata } = args;

  if (!mem0Functions) {
    return false;
  }

  try {
    await mem0Functions.storeUserMemory(userId, content, type, metadata);
    return true;
  } catch (error) {
    logger.error("[UnifiedMemory] Mem0 store failed:", error);
    return false;
  }
}
