import { NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import { logger } from "@/lib/logger";
import { resolveXpTier } from "@/lib/xp/tier";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createClient } from "@/server/services/supabase/server";


type RpcRow = Record<string, UntypedJson>;

type CompleteQuestRouteContext = {
  params: Promise<{ questCode: string }>;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseBodyMetadata(body: unknown): Record<string, UntypedJson> {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const asRecord = body as Record<string, UntypedJson>;
    if (asRecord.metadata && typeof asRecord.metadata === "object" && !Array.isArray(asRecord.metadata)) {
      return asRecord.metadata as Record<string, UntypedJson>;
    }
    return asRecord;
  }
  return {};
}

export async function POST(request: NextRequest, { params }: CompleteQuestRouteContext) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return apiResponse.unauthorized("Please sign in to complete quests");
    }

    const { questCode } = await params;
    if (!questCode || questCode.trim().length === 0) {
      return apiResponse.badRequest("Quest code is required", "QUEST_CODE_REQUIRED");
    }

    const metadata = parseBodyMetadata(await request.json().catch(() => ({})));

    const supabase = await createClient();
    if (!supabase) {
      return apiResponse.serviceUnavailable("Database unavailable");
    }

    const { data, error } = await supabase.rpc("complete_quest", {
      p_user_id: user.id,
      p_quest_code: questCode,
      p_metadata: metadata,
    });

    if (error) {
      logger.error("[Rewards Quest Complete] complete_quest failed", error);
      return apiResponse.badRequest(error.message || "Failed to complete quest", error.code);
    }

    const row = (data?.[0] ?? data ?? null) as RpcRow | null;
    if (!row) {
      return apiResponse.internalError("No result from complete_quest");
    }

    const totalXp = toNumber(row.total_xp, 0);

    return apiResponse.success({
      success: Boolean(row.success),
      xpEarned: toNumber(row.xp_earned, 0),
      totalXp,
      newLevel: toNumber(row.new_level, 1),
      tier: resolveXpTier(totalXp),
      message: typeof row.message === "string" ? row.message : "Quest processed",
    });
  } catch (error) {
    logger.error("[Rewards Quest Complete] Unexpected error", error);
    return apiResponse.internalError(error instanceof Error ? error.message : "Failed to complete quest");
  }
}
