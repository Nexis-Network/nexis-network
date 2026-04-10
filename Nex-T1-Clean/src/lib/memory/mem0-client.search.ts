import "server-only";

import { redis } from "@/server/services/redis";
import { logger } from "@/lib/logger";

import { callMem0Api } from "./mem0-client.api";
import { Mem0ApiError, getMem0ErrorStatus, isMem0Configured } from "./mem0-client.config";
import type {
  Mem0GetAllParams,
  Mem0Memory,
  Mem0SearchParams,
} from "./mem0-client.types";

function hashQuery(query: string): string {
  let hash = 0;

  for (let index = 0; index < query.length; index += 1) {
    const char = query.charCodeAt(index);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }

  return Math.abs(hash).toString(36);
}

function coerceMemories(payload: UntypedJson): Mem0Memory[] {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? Array.isArray((payload as { memories?: UntypedJson }).memories)
        ? (payload as { memories: UntypedJson[] }).memories
        : Array.isArray((payload as { data?: UntypedJson }).data)
          ? (payload as { data: UntypedJson[] }).data
          : Array.isArray((payload as { results?: UntypedJson }).results)
            ? (payload as { results: UntypedJson[] }).results
            : []
      : [];

  return list.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, UntypedJson>;
    const idRaw = record.id ?? record.memory_id ?? record._id;
    const textRaw = record.text ?? record.memory ?? record.content;
    const scoreRaw = record.score ?? record.relevance;
    const metadataRaw = record.metadata;
    const id = typeof idRaw === "string" ? idRaw : idRaw ? String(idRaw) : "";
    const text =
      typeof textRaw === "string" ? textRaw : textRaw ? String(textRaw) : "";
    const score = typeof scoreRaw === "number" ? scoreRaw : 1;
    const metadata =
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? (metadataRaw as Record<string, UntypedJson>)
        : undefined;

    if (!id || !text) {
      return [];
    }

    return [metadata ? { id, text, score, metadata } : { id, text, score }];
  });
}

export async function searchUserMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<Mem0Memory[]> {
  if (!isMem0Configured()) {
    return [];
  }

  const cacheKey = `mem0:search:${userId}:${hashQuery(query)}:${limit}`;

  try {
    const cached = await redis.get<Mem0Memory[]>(cacheKey);
    if (cached) {
      logger.debug("[mem0] Cache HIT:", query.slice(0, 30));
      return cached;
    }
  } catch {
    // Ignore cache misses.
  }

  try {
    const result = await callMem0Api<{ memories: Mem0Memory[] }>(
      "/v2/memories/search/",
      {
        method: "POST",
        body: JSON.stringify({
          query,
          limit,
          userId,
          user_id: userId,
          filters: {
            AND: [{ user_id: userId }],
          },
        } satisfies Mem0SearchParams),
      },
    );
    const memories = result.memories ?? [];

    try {
      await redis.set(cacheKey, memories, { ex: 300 });
    } catch {
      // Ignore cache write failures.
    }

    logger.debug("[mem0] Cache MISS, fetched:", memories.length);
    return memories;
  } catch (error) {
    if (getMem0ErrorStatus(error) === 405) {
      logger.warn(
        "[mem0] /v2/memories/search rejected with 405. Verify MEM0_BASE_URL and API version configuration.",
      );
    } else if (!(error instanceof Mem0ApiError && error.status === 405)) {
      logger.error("[mem0] Search error:", error);
    }

    return [];
  }
}

export async function getAllUserMemories(userId: string): Promise<Mem0Memory[]> {
  if (!isMem0Configured()) {
    return [];
  }

  try {
    try {
      const payload: Mem0GetAllParams = {
        filters: {
          AND: [{ user_id: userId }],
        },
        page: 1,
        page_size: 200,
      };

      const result = await callMem0Api<UntypedJson>("/v2/memories/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return coerceMemories(result);
    } catch (error) {
      const status = getMem0ErrorStatus(error);
      if (status !== 404 && status !== 405) {
        throw error;
      }

      logger.warn(
        "[mem0] /v2/memories list rejected. Falling back to /v2/memories/search. Verify MEM0_BASE_URL and API version configuration.",
      );

      const result = await callMem0Api<{ memories: Mem0Memory[] }>(
        "/v2/memories/search/",
        {
          method: "POST",
          body: JSON.stringify({
            query: "",
            limit: 200,
            userId,
            user_id: userId,
            filters: {
              AND: [{ user_id: userId }],
            },
          } satisfies Mem0SearchParams),
        },
      );

      return result.memories ?? [];
    }
  } catch (error) {
    logger.error("[mem0] Get all memories error:", error);
    return [];
  }
}
