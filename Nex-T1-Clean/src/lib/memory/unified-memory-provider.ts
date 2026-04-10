import "server-only";

import { UnifiedMemoryProvider } from "./unified-memory-provider.service";
import type {
  MemoryContext,
  UnifiedMemoryConfig,
} from "./unified-memory-provider.types";
import { logger } from "@/lib/logger";

export type {
  MemoryContext,
  MemorySource,
  UnifiedMemoryConfig,
  UnifiedMemoryEntry,
} from "./unified-memory-provider.types";
export { UnifiedMemoryProvider } from "./unified-memory-provider.service";

let unifiedMemoryInstance: UnifiedMemoryProvider | null = null;

export function getUnifiedMemoryProvider(
  config?: UnifiedMemoryConfig,
): UnifiedMemoryProvider {
  if (!unifiedMemoryInstance) {
    unifiedMemoryInstance = new UnifiedMemoryProvider(config);
  }

  return unifiedMemoryInstance;
}

export async function getMemoryContextForChat(
  userId: string | null | undefined,
  query: string,
): Promise<MemoryContext | null> {
  if (!userId) {
    return null;
  }

  try {
    return await getUnifiedMemoryProvider().getContext(userId, query);
  } catch (error) {
    logger.error("[UnifiedMemory] Failed to get context:", error);
    return null;
  }
}

export async function storeUserPreference(
  userId: string,
  preference: string,
  category?: string,
): Promise<boolean> {
  try {
    const result = await getUnifiedMemoryProvider().storeMemory(
      userId,
      preference,
      "personalization",
      {
        category,
        extractedAt: Date.now(),
      },
    );

    return result.success;
  } catch (error) {
    logger.error("[UnifiedMemory] Failed to store preference:", error);
    return false;
  }
}
