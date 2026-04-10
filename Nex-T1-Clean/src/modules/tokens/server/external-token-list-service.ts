import "server-only";

import { logger } from "@/lib/logger";
import type { TokenRegistryEntry } from "@/modules/tokens/types";
import {
  EXTERNAL_TOKEN_LIST_CACHE_KEY,
  rememberExternalTokenLists,
} from "@/modules/tokens/server/external-token-list-cache";
import { normalizeExternalTokenListPayload } from "@/modules/tokens/server/external-token-list-normalizer";
import {
  EXTERNAL_TOKEN_LIST_SOURCES,
  type ExternalTokenListSource,
} from "@/modules/tokens/server/external-token-list-sources";

export interface ExternalTokenListSourceStatus {
  error?: string;
  id: string;
  name: string;
  tokenCount: number;
  url: string;
}

export interface ExternalTokenListSnapshot {
  entries: TokenRegistryEntry[];
  fetchedAt: string;
  sources: ExternalTokenListSourceStatus[];
}

async function fetchListPayload(source: ExternalTokenListSource): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "Nex-T1-Enterprise/1.0" },
      signal: controller.signal,
      next: {
        revalidate: 3600,
        tags: [`token-list:${source.id}`],
      },
    });

    if (!response.ok) {
      throw new Error(`status_${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function buildExternalTokenListSnapshot(): Promise<ExternalTokenListSnapshot> {
  const resolved = await Promise.all(
    EXTERNAL_TOKEN_LIST_SOURCES.map(async (source) => {
      try {
        const payload = await fetchListPayload(source);
        const entries = normalizeExternalTokenListPayload(source, payload);

        return {
          entries,
          status: {
            id: source.id,
            name: source.name,
            tokenCount: entries.length,
            url: source.url,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          { error: message, source: source.id, url: source.url },
          "external_token_list_fetch_failed",
        );

        return {
          entries: [],
          status: {
            error: message,
            id: source.id,
            name: source.name,
            tokenCount: 0,
            url: source.url,
          },
        };
      }
    }),
  );

  return {
    entries: resolved.flatMap((item) => item.entries),
    fetchedAt: new Date().toISOString(),
    sources: resolved.map((item) => item.status),
  };
}

export async function getExternalTokenListSnapshot(): Promise<ExternalTokenListSnapshot> {
  if (process.env.NODE_ENV === "test") {
    return {
      entries: [],
      fetchedAt: new Date(0).toISOString(),
      sources: [],
    };
  }

  return rememberExternalTokenLists(
    EXTERNAL_TOKEN_LIST_CACHE_KEY,
    buildExternalTokenListSnapshot,
  );
}
