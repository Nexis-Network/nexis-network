export type MemoryType = "short_term" | "long_term" | "core";

export type MemoryEntry = {
  id: string;
  type: MemoryType;
  content: string;
  metadata?: Record<string, UntypedJson>;
  score?: number;
  createdAt: number;
  expiresAt?: number;
};

export type BedrockMemoryConfig = {
  region: string;
  knowledgeBaseId: string;
  agentId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export type MemoryRetrievalOptions = {
  limit?: number;
  minScore?: number;
  types?: MemoryType[];
  includeMetadata?: boolean;
};

export type MemorySearchResult = {
  entries: MemoryEntry[];
  query: string;
  totalRetrieved: number;
  latencyMs: number;
};
