import "server-only";

import { getBedrockMemoryClient } from "./bedrock-memory";
import {
  loadMem0Functions,
} from "./unified-memory-provider.mem0";
import {
  getUnifiedMemoryContext,
  storeUnifiedMemoryEntry,
} from "./unified-memory-provider.operations";
import {
  clearRedisShortTermMemory,
} from "./unified-memory-provider.redis";
import {
  DEFAULT_UNIFIED_MEMORY_CONFIG,
  type Mem0Functions,
  type MemoryContext,
  type MemorySource,
  type UnifiedMemoryBackendState,
  type UnifiedMemoryConfig,
} from "./unified-memory-provider.types";
import { logger } from "@/lib/logger";
import { redis, isRedisConfigured } from "@/server/services/redis";
import type { ServerRedisClient } from "@/server/services/redis";

export class UnifiedMemoryProvider {
  private config: Required<UnifiedMemoryConfig>;
  private redisClient: ServerRedisClient | null = null;
  private bedrockClient = getBedrockMemoryClient();
  private mem0Functions: Mem0Functions | null = null;
  private initialized = false;

  constructor(config?: UnifiedMemoryConfig) {
    this.config = { ...DEFAULT_UNIFIED_MEMORY_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.config.enableRedis && isRedisConfigured) {
      this.redisClient = redis;
    }

    if (this.config.enableBedrock && !this.bedrockClient) {
      logger.warn("[UnifiedMemory] Bedrock Memory not configured");
    }

    if (this.config.enableMem0) {
      this.mem0Functions = await loadMem0Functions();
    }

    this.initialized = true;
  }

  async getContext(userId: string, query: string): Promise<MemoryContext> {
    await this.initialize();
    return getUnifiedMemoryContext(this.getState(), userId, query);
  }

  async storeMemory(
    userId: string,
    content: string,
    type: "short_term" | "long_term" | "personalization",
    metadata?: Record<string, UntypedJson>,
  ): Promise<{ success: boolean; sources: MemorySource[] }> {
    await this.initialize();
    return storeUnifiedMemoryEntry(this.getState(), userId, content, type, metadata);
  }

  async clearShortTermMemory(userId: string): Promise<void> {
    await this.initialize();

    await clearRedisShortTermMemory({
      redisClient: this.redisClient,
      userId,
      maxEntries: this.config.maxEntriesPerSource,
    });
  }

  private getState(): UnifiedMemoryBackendState {
    return {
      config: this.config,
      redisClient: this.redisClient,
      bedrockClient: this.bedrockClient,
      mem0Functions: this.mem0Functions,
    };
  }
}
