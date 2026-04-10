import "server-only";

import { logger } from "@/lib/logger";

import { containsSensitiveContent } from "./mem0-client.content-filter";
import { isMem0Configured } from "./mem0-client.config";
import { searchUserMemories } from "./mem0-client.search";
import { storeUserMemory, updateMemory } from "./mem0-client.mutations";
import type {
  AddMemorySafeOptions,
  AddMemorySafeResult,
} from "./mem0-client.types";

function normalizeMemoryText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let shared = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) {
      shared += 1;
    }
  });

  return shared / Math.min(tokensA.size, tokensB.size);
}

function isLikelyDuplicateMemory(candidate: string, existing: string): boolean {
  const normalizedCandidate = normalizeMemoryText(candidate);
  const normalizedExisting = normalizeMemoryText(existing);

  if (!normalizedCandidate || !normalizedExisting) {
    return false;
  }

  if (normalizedCandidate === normalizedExisting) {
    return true;
  }

  if (
    normalizedCandidate.includes(normalizedExisting) ||
    normalizedExisting.includes(normalizedCandidate)
  ) {
    return true;
  }

  return tokenOverlap(normalizedCandidate, normalizedExisting) >= 0.8;
}

export async function addMemorySafe(
  userId: string,
  content: string,
  options: AddMemorySafeOptions = {},
): Promise<AddMemorySafeResult> {
  if (!isMem0Configured()) {
    return { stored: false, reason: "mem0_disabled" };
  }

  const trimmed = content?.trim();
  if (!trimmed) {
    return { stored: false, reason: "empty" };
  }

  if (!options.allowSensitive && containsSensitiveContent(trimmed)) {
    return { stored: false, reason: "sensitive_content" };
  }

  const confidence =
    typeof options.confidence === "number" ? options.confidence : null;
  const minConfidence =
    typeof options.minConfidence === "number" ? options.minConfidence : 0;

  if (confidence !== null && confidence < minConfidence) {
    return { stored: false, reason: "low_confidence" };
  }

  if (options.preventDuplicates) {
    try {
      const existing = await searchUserMemories(userId, trimmed, 5);
      const duplicate = existing.find((memory) =>
        isLikelyDuplicateMemory(trimmed, memory.text),
      );

      if (duplicate) {
        const updated = await updateMemory(duplicate.id, trimmed);
        return updated
          ? { stored: true, event: "updated", memoryId: duplicate.id }
          : { stored: false, reason: "update_failed" };
      }
    } catch (error) {
      logger.warn("[mem0] Duplicate detection failed:", error);
    }
  }

  const result = await storeUserMemory(userId, trimmed, options.category, {
    ...options.metadata,
    confidence: confidence ?? undefined,
    preventDuplicates: Boolean(options.preventDuplicates),
  });

  if (result.success) {
    return { stored: true, event: "created", memoryId: result.memoryId };
  }

  return { stored: false, reason: "store_failed" };
}
