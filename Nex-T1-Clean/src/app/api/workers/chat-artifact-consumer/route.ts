import { apiResponse } from "@/lib/api-platform";

import { redis, isRedisConfigured } from "@/server/services/redis";

import { ARTIFACT_QUEUE_KEY, type ArtifactJobPayload } from "@/modules/chat/artifacts";
import { cacheConversationSummary } from "@/modules/chat/state/conversation-summary-store";
import { embedConversationTurn } from "@/lib/rag/conversation-embedder";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { extractAndStorePreferences } from "@/lib/memory/preference-extractor";


import { logger } from '@/lib/logger';

function verifyWorkerAuth(request: Request): Response | null {
  const expectedKey = process.env.CRON_SECRET;
  if (!expectedKey) {
    logger.error("[chat-artifacts-worker] CRON_SECRET env var is not set — rejecting request");
    return apiResponse.serviceUnavailable("service_misconfigured");
  }

  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const headerKey = request.headers.get("x-nexis-internal-secret");
  const token = bearer || headerKey;

  if (!token || token !== expectedKey) {
    return apiResponse.unauthorized("unauthorized");
  }
  return null;
}

export async function POST(request: Request) {
  const authError = verifyWorkerAuth(request);
  if (authError) return authError;
  return runSafely(request);
}

export async function GET(request: Request) {
  const authError = verifyWorkerAuth(request);
  if (authError) return authError;
  return runSafely(request);
}

async function runSafely(request: Request) {
  try {
    return await runWorker(request);
  } catch (error) {
    logger.error("[chat-artifacts-worker] fatal", error);
    return apiResponse.internalError(
      error instanceof Error ? error.message : String(error)
    );
  }
}

type ArtifactJobRecord = ArtifactJobPayload & { id: string; enqueuedAt: string };

type WorkerStats = {
  dequeued: number;
  processed: number;
  skipped: number;
  embeddings: number;
  summaries: number;
  preferenceExtractions: number;
  errors: number;
};

async function runWorker(request: Request) {
  if (!isRedisConfigured || !redis.lpop) {
    return apiResponse.serviceUnavailable("redis_unavailable");
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? process.env.NEX_ARTIFACT_WORKER_BATCH ?? 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 10;
  const supabase = createServiceRoleClient();
  const stats: WorkerStats = {
    dequeued: 0,
    processed: 0,
    skipped: 0,
    embeddings: 0,
    summaries: 0,
    preferenceExtractions: 0,
    errors: 0,
  };

  for (let i = 0; i < limit; i++) {
    const raw = await redis.lpop(ARTIFACT_QUEUE_KEY);
    if (!raw) {
      break;
    }
    stats.dequeued += 1;

    let job: ArtifactJobRecord | null = null;
    try {
      job = JSON.parse(raw) as ArtifactJobRecord;
    } catch (error) {
      stats.errors += 1;
      logger.error("[chat-artifacts-worker] invalid job payload", { raw, error });
      continue;
    }

    try {
      const processed = await processJob(supabase, job);
      if (!processed) {
        stats.skipped += 1;
        continue;
      }
      stats.processed += 1;
      stats.embeddings += Number(processed.includes("embed"));
      stats.summaries += Number(processed.includes("summary"));
      stats.preferenceExtractions += Number(processed.includes("preferences"));
    } catch (error) {
      stats.errors += 1;
      logger.error("[chat-artifacts-worker] job failed", { jobId: job.id, error });
    }
  }

  return apiResponse.success({ status: "ok", ...stats });
}


type ProcessResult = Array<"embed" | "summary" | "preferences">;

async function processJob(
  supabase: ReturnType<typeof createServiceRoleClient>,
  job: ArtifactJobRecord,
): Promise<ProcessResult | null> {
  const result: ProcessResult = [];
  const userId = job.userId ?? null;
  const submissionId = job.submissionId ?? null;
  const userMessage = job.userMessage ?? null;
  const assistantMessage = job.assistantMessage ?? null;

  if (!userId || !assistantMessage) {
    return null;
  }

  if (submissionId && userMessage) {
    await cacheConversationSummary({
      submissionId,
      userId,
      query: userMessage,
      response: assistantMessage,
      model: job.modelId,
      promptProfileId: job.promptProfileId,
    });
    result.push("summary");
  }

  if (userMessage) {
    await embedConversationTurn(supabase, userId, submissionId, userMessage, assistantMessage, {
      route: job.route,
      ...(job.metadata ?? {}),
    });
    result.push("embed");
  }

  if (job.shouldExtractPreferences && userMessage) {
    await extractAndStorePreferences(userId, userMessage).catch((error) => {
      logger.warn("[chat-artifacts-worker] preference extraction failed", { jobId: job.id, error });
    });
    result.push("preferences");
  }

  return result;
}
