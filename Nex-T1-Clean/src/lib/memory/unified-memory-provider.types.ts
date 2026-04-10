import type {
  BedrockMemoryClient,
  MemoryEntry,
} from "./bedrock-memory";
import type { ServerRedisClient } from "@/server/services/redis";

export type MemorySource = "redis" | "mem0" | "bedrock";

export type UnifiedMemoryEntry = MemoryEntry & {
  source: MemorySource;
};

export type MemoryContext = {
  shortTerm: UnifiedMemoryEntry[];
  longTerm: UnifiedMemoryEntry[];
  personalization: UnifiedMemoryEntry[];
  formatted: string;
  sources: MemorySource[];
  latencyMs: number;
};

export type UnifiedMemoryConfig = {
  enableRedis?: boolean;
  enableMem0?: boolean;
  enableBedrock?: boolean;
  shortTermTtlSeconds?: number;
  maxEntriesPerSource?: number;
};

export const DEFAULT_UNIFIED_MEMORY_CONFIG: Required<UnifiedMemoryConfig> = {
  enableRedis: true,
  enableMem0: true,
  enableBedrock: true,
  shortTermTtlSeconds: 300,
  maxEntriesPerSource: 5,
};

export type Mem0SearchFn = (
  userId: string,
  query: string,
  limit?: number,
) => Promise<
  Array<{
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, UntypedJson>;
  }>
>;

export type Mem0AddFn = (
  userId: string,
  content: string,
  category?: string,
  metadata?: Record<string, UntypedJson>,
) => Promise<{ success: boolean; memoryId?: string }>;

export type Mem0ConfiguredFn = () => boolean;

export type Mem0Functions = {
  searchUserMemories: Mem0SearchFn;
  storeUserMemory: Mem0AddFn;
  isMem0Configured: Mem0ConfiguredFn;
};

export type UnifiedMemoryBackendState = {
  config: Required<UnifiedMemoryConfig>;
  redisClient: ServerRedisClient | null;
  bedrockClient: BedrockMemoryClient | null;
  mem0Functions: Mem0Functions | null;
};
