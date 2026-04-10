import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { z } from "zod";

import { invalidateCache, listCacheEntries } from "@/server/services/redis/cache-managers/artifact-cache";
import { getVerifiedSupabaseSession } from "@/server/auth/session";
import { isAdminUser } from "@/server/auth/admin";
import { requireInternalProtection } from "@/lib/security/csrf";

const invalidateSchema = z.object({
  key: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await getVerifiedSupabaseSession({ request });
  if (!session || !isAdminUser(session.user)) {
    return apiResponse.forbidden("Forbidden");
  }
  const entries = await listCacheEntries();
  return apiResponse.success({
    success: true,
    data: entries,
  });
}

export async function POST(request: NextRequest) {
  const guard = requireInternalProtection(request);
  if (guard) return guard;

  const session = await getVerifiedSupabaseSession({ request });
  if (!session || !isAdminUser(session.user)) {
    return apiResponse.forbidden("Forbidden");
  }
  try {
    const json = await request.json();
    const { key } = invalidateSchema.parse(json);
    const result = await invalidateCache(key);
    return apiResponse.success({
      success: true,
      data: result,
    });
  } catch (error) {
    return apiResponse.badRequest(
      error instanceof Error ? error.message : "Invalid cache request",
      "CACHE_INVALIDATE_ERROR"
    );
  }
}

