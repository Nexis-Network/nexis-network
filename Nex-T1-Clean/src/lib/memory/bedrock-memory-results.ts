import type {
  KnowledgeBaseRetrievalResult,
  RetrieveCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

import type {
  BedrockMemoryConfig,
  MemoryEntry,
  MemorySearchResult,
  MemoryType,
} from "./bedrock-memory.types";

function extractMemoryType(result: KnowledgeBaseRetrievalResult): MemoryType {
  const metadata = result.metadata ?? {};
  const typeField = metadata["memoryType"] ?? metadata["type"];

  if (typeField === "core" || typeField === "long_term" || typeField === "short_term") {
    return typeField;
  }

  const uri = result.location?.s3Location?.uri ?? "";
  if (uri.includes("/core/")) {
    return "core";
  }
  if (uri.includes("/long-term/")) {
    return "long_term";
  }
  if (uri.includes("/short-term/")) {
    return "short_term";
  }

  return "long_term";
}

function extractTimestamp(result: KnowledgeBaseRetrievalResult): number {
  const metadata = result.metadata ?? {};
  const timestamp = metadata["createdAt"] ?? metadata["timestamp"];

  if (typeof timestamp === "number") {
    return timestamp;
  }

  if (typeof timestamp === "string") {
    const parsed = Date.parse(timestamp);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function extractMetadata(
  result: KnowledgeBaseRetrievalResult,
): Record<string, UntypedJson> {
  const metadata: Record<string, UntypedJson> = {};

  if (result.metadata) {
    Object.assign(metadata, result.metadata);
  }

  if (result.location?.s3Location) {
    metadata.sourceUri = result.location.s3Location.uri;
  }

  metadata.score = result.score;
  return metadata;
}

export function buildBedrockRetrieveInput(args: {
  config: BedrockMemoryConfig;
  userId: string;
  query: string;
  limit: number;
}): RetrieveCommandInput {
  const { config, userId, query, limit } = args;

  return {
    knowledgeBaseId: config.knowledgeBaseId,
    retrievalQuery: {
      text: query,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: limit * 2,
        overrideSearchType: "HYBRID",
        filter: {
          equals: {
            key: "userId",
            value: userId,
          },
        },
      },
    },
  };
}

export function mapBedrockRetrievalResults(args: {
  results: KnowledgeBaseRetrievalResult[];
  limit: number;
  minScore: number;
  types?: MemoryType[];
  includeMetadata: boolean;
}): { entries: MemoryEntry[]; totalRetrieved: number } {
  const { results, limit, minScore, types, includeMetadata } = args;
  const entries: MemoryEntry[] = [];

  for (const result of results) {
    const score = result.score ?? 0;
    if (score < minScore) {
      continue;
    }

    const memoryType = extractMemoryType(result);
    if (types && types.length > 0 && !types.includes(memoryType)) {
      continue;
    }

    entries.push({
      id: result.location?.s3Location?.uri ?? `memory-${Date.now()}`,
      type: memoryType,
      content: result.content?.text ?? "",
      score,
      createdAt: extractTimestamp(result),
      metadata: includeMetadata ? extractMetadata(result) : undefined,
    });

    if (entries.length >= limit) {
      break;
    }
  }

  return {
    entries,
    totalRetrieved: results.length,
  };
}

export function createEmptyMemorySearchResult(
  query: string,
  startTime: number,
): MemorySearchResult {
  return {
    entries: [],
    query,
    totalRetrieved: 0,
    latencyMs: Date.now() - startTime,
  };
}
