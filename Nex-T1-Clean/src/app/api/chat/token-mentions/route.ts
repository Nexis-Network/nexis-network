import { NextRequest } from "next/server";
import { z } from "zod";

import { apiResponse } from "@/lib/api-platform";
import {
  formatCoinMentionContext,
} from "@/components/chat-composer/token-mentions";
import {
  getCoinMentionContextRecord,
  getCoinMentionContextRecords,
  getRecentlyListedCoins,
  searchTokenMentions,
} from "@/server/market/coingecko";

import { logger } from "@/lib/logger";

const GetQuerySchema = z
  .object({
    query: z.string().trim().min(1).max(100).optional(),
    id: z.string().trim().min(1).max(120).optional(),
    recent: z.union([z.literal("1"), z.literal("true")]).optional(),
  })
  .superRefine((value, context) => {
    const modes = [value.query ? 1 : 0, value.id ? 1 : 0, value.recent ? 1 : 0].reduce(
      (sum, current) => sum + current,
      0,
    );

    if (modes !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of query, id, or recent.",
      });
    }
  });

const PostBodySchema = z.object({
  ids: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = GetQuerySchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    id: url.searchParams.get("id") ?? undefined,
    recent: url.searchParams.get("recent") ?? undefined,
  });

  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  try {
    if (parsed.data.query) {
      const result = await searchTokenMentions(parsed.data.query);
      return apiResponse.success({
        results: result.data,
        fetchedAt: result.fetchedAt,
        cache: result.cache,
        stale: result.stale ?? false,
      });
    }

    if (parsed.data.id) {
      const result = await getCoinMentionContextRecord(parsed.data.id);
      return apiResponse.success({
        record: result.data,
        fetchedAt: result.fetchedAt,
        cache: result.cache,
        stale: result.stale ?? false,
      });
    }

    const result = await getRecentlyListedCoins();
    return apiResponse.success({
      results: result.data.items,
      source: result.data.source,
      fetchedAt: result.fetchedAt,
      cache: result.cache,
      stale: result.stale ?? false,
    });
  } catch (error) {
    logger.error("[api/chat/token-mentions] GET failed", error);
    return apiResponse.internalError("Failed to load token mention data");
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return apiResponse.badRequest("Request body must be valid JSON");
  }

  const parsed = PostBodySchema.safeParse(payload);
  if (!parsed.success) {
    return apiResponse.validationError(parsed.error);
  }

  try {
    const result = await getCoinMentionContextRecords(parsed.data.ids);
    return apiResponse.success({
      records: result.data,
      context: formatCoinMentionContext(result.data),
      fetchedAt: result.fetchedAt,
      cache: result.cache,
      stale: result.stale ?? false,
    });
  } catch (error) {
    logger.error("[api/chat/token-mentions] POST failed", error);
    return apiResponse.internalError("Failed to build token mention context");
  }
}
