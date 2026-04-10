/**
 * Memory Tool
 *
 * Domain: AI Tools - Memory
 * Responsibility: Store and recall user-scoped memory entries through the unified memory provider.
 */

import type { JSONSchema7 } from "json-schema";

import {
  createTool,
  createToolSchema,
  enumProp,
  integerProp,
  stringProp,
  type ToolExecutionContext,
} from "./create-tool";
import { UnifiedMemoryProvider, type MemorySource } from "@/lib/memory/unified-memory-provider";
import { createClient } from "@/server/services/supabase/server";

type MemoryAction = "store" | "recall";

type MemoryStoreType = "short_term" | "long_term" | "personalization";

type MemoryResultType = MemoryStoreType | "core";

type MemoryToolInput = {
  action: MemoryAction;
  content: string;
  memoryType?: MemoryStoreType;
  limit?: number;
  metadata?: Record<string, UntypedJson>;
};

type MemoryToolOutput = {
  success: boolean;
  message?: string;
  sources?: MemorySource[];
  results?: Array<{
    content: string;
    type: MemoryResultType;
    source: MemorySource;
    score?: number;
    createdAt?: number;
  }>;
  formatted?: string;
  latencyMs?: number;
  error?: string;
};

const metadataSchema: JSONSchema7 = {
  type: "object",
  description: "Optional metadata to store with the memory entry.",
  additionalProperties: true,
};

const memorySchema = createToolSchema(
  {
    action: enumProp("Whether to store or recall memory", ["store", "recall"]),
    content: stringProp("Text to store or query", { minLength: 1, maxLength: 4000 }),
    memoryType: enumProp(
      "Memory type to store",
      ["short_term", "long_term", "personalization"],
      "personalization",
    ),
    limit: integerProp("Maximum number of memory results", { minimum: 1, maximum: 10, default: 5 }),
    metadata: metadataSchema,
  },
  ["action", "content"],
  { additionalProperties: false },
);

const provider = new UnifiedMemoryProvider();

const MAX_ENTRY_CHARS = 800;
const MAX_CONTENT_CHARS = 4000;

function clampLimit(value: number | undefined, fallback = 5): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(10, Math.max(1, Math.floor(value)));
}

function normalizeContent(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > MAX_CONTENT_CHARS ? trimmed.slice(0, MAX_CONTENT_CHARS) : trimmed;
}

function truncateEntry(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > MAX_ENTRY_CHARS ? trimmed.slice(0, MAX_ENTRY_CHARS) : trimmed;
}

function sanitizeMetadata(metadata?: Record<string, UntypedJson>): Record<string, UntypedJson> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const filtered: Record<string, UntypedJson> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalized = key.toLowerCase();
    if (normalized === "user_id" || normalized === "userid") continue;
    if (normalized.includes("token") || normalized.includes("secret") || normalized.includes("private")) continue;
    filtered[key] = value;
  }
  return Object.keys(filtered).length ? filtered : undefined;
}

async function resolveUserId(context?: ToolExecutionContext): Promise<string | null> {
  if (context?.userId && context.userId.trim().length > 0) {
    return context.userId.trim();
  }

  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export const memoryTool = createTool<MemoryToolInput, MemoryToolOutput>({
  description:
    "Store and recall user-specific memories. Use store for preferences or long-term facts; use recall to retrieve relevant context.",
  schema: memorySchema,
  execute: async (input, context): Promise<MemoryToolOutput> => {
    const content = normalizeContent(input.content ?? "");
    if (!content) {
      return { success: false, error: "Content is required." };
    }

    const userId = await resolveUserId(context);
    if (!userId) {
      return { success: false, error: "Authentication required." };
    }

    if (input.action === "store") {
      const memoryType: MemoryStoreType = input.memoryType ?? "personalization";
      const metadata = sanitizeMetadata(input.metadata);
      const result = await provider.storeMemory(userId, content, memoryType, metadata);

      if (!result.success) {
        return {
          success: false,
          error: "Memory backend unavailable. Configure Redis, Mem0, or Bedrock to store memories.",
        };
      }

      return {
        success: true,
        message: `Stored memory in ${result.sources.join(", ")}.`,
        sources: result.sources,
      };
    }

    const limit = clampLimit(input.limit, 5);
    const memoryContext = await provider.getContext(userId, content);

    const combined = [
      ...memoryContext.shortTerm,
      ...memoryContext.personalization,
      ...memoryContext.longTerm,
    ];

    combined.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const results = combined.slice(0, limit).map((entry) => ({
      content: truncateEntry(entry.content),
      type: entry.type as MemoryResultType,
      source: entry.source,
      score: entry.score,
      createdAt: entry.createdAt,
    }));

    return {
      success: true,
      results,
      formatted: memoryContext.formatted,
      latencyMs: memoryContext.latencyMs,
      sources: memoryContext.sources,
    };
  },
});
