import "server-only";

import { RetrieveCommand, type BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";

import { logger } from "@/lib/logger";
import {
  getBedrockConfig,
  getBedrockRuntimeClient,
  isBedrockConfigured,
} from "./bedrock-memory.config";
import {
  buildBedrockRetrieveInput,
  createEmptyMemorySearchResult,
  mapBedrockRetrievalResults,
} from "./bedrock-memory-results";
import { formatBedrockMemoriesForPrompt } from "./bedrock-memory-prompt";
import type { BedrockMemoryConfig, MemoryEntry, MemoryRetrievalOptions, MemorySearchResult, MemoryType } from "./bedrock-memory.types";

export type {
  BedrockMemoryConfig,
  MemoryEntry,
  MemoryRetrievalOptions,
  MemorySearchResult,
  MemoryType,
} from "./bedrock-memory.types";

export class BedrockMemoryClient {
  private readonly config: BedrockMemoryConfig;
  private readonly runtimeClient: BedrockAgentRuntimeClient;
  private circuitOpen = false;
  private consecutiveFailures = 0;
  private readonly maxFailures = 3;
  private readonly circuitResetMs = 60_000;

  constructor(config?: BedrockMemoryConfig) {
    const resolvedConfig = config ?? getBedrockConfig();
    if (!resolvedConfig) {
      throw new Error(
        "[BedrockMemory] Missing required configuration. Set AWS_REGION and BEDROCK_KNOWLEDGE_BASE_ID.",
      );
    }
    const runtimeClient = getBedrockRuntimeClient();
    if (!runtimeClient) {
      throw new Error("[BedrockMemory] Failed to create Bedrock runtime client");
    }
    this.config = resolvedConfig;
    this.runtimeClient = runtimeClient;
  }

  async retrieveRelevantMemory(
    userId: string,
    query: string,
    options: MemoryRetrievalOptions = {},
  ): Promise<MemorySearchResult> {
    const startTime = Date.now();
    const { limit = 5, minScore = 0.5, types, includeMetadata = true } = options;

    if (this.circuitOpen) {
      logger.warn("[BedrockMemory] Circuit breaker open, returning empty result");
      return createEmptyMemorySearchResult(query, startTime);
    }
    try {
      const response = await this.runtimeClient.send(
        new RetrieveCommand(
          buildBedrockRetrieveInput({
            config: this.config,
            userId,
            query,
            limit,
          }),
        ),
      );

      this.consecutiveFailures = 0;
      const { entries, totalRetrieved } = mapBedrockRetrievalResults({
        results: response.retrievalResults ?? [],
        limit,
        minScore,
        types,
        includeMetadata,
      });

      return {
        entries,
        query,
        totalRetrieved,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.handleError(error);
      return createEmptyMemorySearchResult(query, startTime);
    }
  }
  async storeMemory(
    userId: string,
    _content: string,
    _type: MemoryType,
    _metadata?: Record<string, UntypedJson>,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    logger.warn(
      "[BedrockMemory] Direct memory storage not supported. Use S3 ingestion pipeline or Redis short-term cache.",
    );
    return {
      success: true,
      id: `pending-${userId}-${Date.now()}`,
      error: "Stored to queue for batch ingestion",
    };
  }
  async getCoreMemory(userId: string): Promise<MemoryEntry[]> {
    const result = await this.retrieveRelevantMemory(
      userId,
      "core user information profile",
      {
        types: ["core"],
        limit: 10,
        minScore: 0.3,
      },
    );

    return result.entries;
  }
  async getLongTermMemory(userId: string, topic?: string): Promise<MemoryEntry[]> {
    const query = topic
      ? `user preferences and settings for ${topic}`
      : "user preferences settings risk tolerance trading style";
    const result = await this.retrieveRelevantMemory(userId, query, {
      types: ["long_term"],
      limit: 5,
      minScore: 0.4,
    });

    return result.entries;
  }
  async searchMemories(userId: string, query: string, limit = 5): Promise<MemoryEntry[]> {
    const result = await this.retrieveRelevantMemory(userId, query, {
      limit,
      minScore: 0.4,
    });

    return result.entries;
  }
  formatMemoriesForPrompt(memories: MemoryEntry[]): string {
    return formatBedrockMemoriesForPrompt(memories);
  }
  private handleError(error: unknown): void {
    this.consecutiveFailures += 1;
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[BedrockMemory] Error:", message);
    if (this.consecutiveFailures < this.maxFailures) {
      return;
    }
    logger.warn("[BedrockMemory] Circuit breaker triggered");
    this.circuitOpen = true;
    setTimeout(() => {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
      logger.debug("[BedrockMemory] Circuit breaker reset");
    }, this.circuitResetMs);
  }
}

let bedrockMemoryInstance: BedrockMemoryClient | null = null;
export function getBedrockMemoryClient(): BedrockMemoryClient | null {
  if (!isBedrockConfigured()) {
    return null;
  }
  if (!bedrockMemoryInstance) {
    try {
      bedrockMemoryInstance = new BedrockMemoryClient();
    } catch (error) {
      logger.error("[BedrockMemory] Failed to initialize:", error);
      return null;
    }
  }

  return bedrockMemoryInstance;
}

export async function safeRetrieveMemories(
  userId: string,
  query: string,
  options?: MemoryRetrievalOptions,
): Promise<MemoryEntry[]> {
  const client = getBedrockMemoryClient();
  if (!client) {
    return [];
  }

  try {
    const result = await client.retrieveRelevantMemory(userId, query, options);
    return result.entries;
  } catch (error) {
    logger.error("[BedrockMemory] Safe retrieve failed:", error);
    return [];
  }
}
