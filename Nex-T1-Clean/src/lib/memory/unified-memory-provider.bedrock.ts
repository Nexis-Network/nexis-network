import "server-only";

import type { BedrockMemoryClient } from "./bedrock-memory";
import { logger } from "@/lib/logger";

import type { UnifiedMemoryEntry } from "./unified-memory-provider.types";

export async function fetchBedrockContext(args: {
  bedrockClient: BedrockMemoryClient | null;
  userId: string;
  query: string;
  maxEntries: number;
}): Promise<UnifiedMemoryEntry[]> {
  const { bedrockClient, userId, query, maxEntries } = args;

  if (!bedrockClient) {
    return [];
  }

  try {
    const result = await bedrockClient.retrieveRelevantMemory(userId, query, {
      limit: maxEntries,
      minScore: 0.4,
    });

    return result.entries.map((entry) => ({
      ...entry,
      source: "bedrock" as const,
    }));
  } catch (error) {
    logger.error("[UnifiedMemory] Bedrock fetch failed:", error);
    return [];
  }
}

export async function storeBedrockLongTermMemory(args: {
  bedrockClient: BedrockMemoryClient | null;
  userId: string;
  content: string;
  metadata?: Record<string, UntypedJson>;
}): Promise<boolean> {
  const { bedrockClient, userId, content, metadata } = args;

  if (!bedrockClient) {
    return false;
  }

  try {
    await bedrockClient.storeMemory(userId, content, "long_term", metadata);
    return true;
  } catch (error) {
    logger.error("[UnifiedMemory] Bedrock store failed:", error);
    return false;
  }
}
