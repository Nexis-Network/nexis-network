import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import { runTaskNowForUser } from "@/server/tasks/repository";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { randomUUID } from "node:crypto";
import { redis } from "@/server/services/redis";
import {
    taskWebhookBodySchema,
    taskWebhookSignatureSchema,
} from "@/server/api/validators/webhooks";


import { logger } from '@/lib/logger';
const SIGNING_SECRET = process.env.TASK_WEBHOOK_SECRET;
const SIGNATURE_HEADER = "x-task-signature";
const ALLOWED_SKEW_SECONDS = 5 * 60;

function parseSignatureHeader(raw: string | null) {
    if (!raw) return null;
    const parts = raw.split(",").map((p) => p.trim());
    const t = parts.find((p) => p.startsWith("t="))?.slice(2);
    const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
    if (!t || !v1) return null;
    const timestamp = Number(t);
    if (!Number.isFinite(timestamp)) return null;
    const parsed = taskWebhookSignatureSchema.safeParse({ timestamp, signature: v1 });
    return parsed.success ? parsed.data : null;
}

function computeSignature({ timestamp, payload }: { timestamp: number; payload: string }) {
    if (!SIGNING_SECRET) return null;
    const hmac = crypto.createHmac("sha256", SIGNING_SECRET);
    hmac.update(`${timestamp}.${payload}`);
    return hmac.digest("hex");
}

export async function POST(req: NextRequest) {
    const requestId = req.headers.get("x-request-id") || randomUUID();
    try {
        if (!SIGNING_SECRET) {
            logger.error("[run-task] Missing TASK_WEBHOOK_SECRET", { requestId });
            return apiResponse.unauthorized();
        }

        const signatureHeader = parseSignatureHeader(req.headers.get(SIGNATURE_HEADER));
        const nowSeconds = Math.floor(Date.now() / 1000);

        if (!signatureHeader) {
            Sentry.captureMessage("run-task invalid signature header", { level: "warning", tags: { area: "webhook" }, extra: { requestId } });
            return apiResponse.error("INVALID_SIGNATURE", "invalid_signature_header", 401, undefined, requestId);
        }

        if (Math.abs(nowSeconds - signatureHeader.timestamp) > ALLOWED_SKEW_SECONDS) {
            return apiResponse.error("STALE_SIGNATURE", "stale_signature", 401, undefined, requestId);
        }

        const rawBody = await req.text();
        const expected = computeSignature({ timestamp: signatureHeader.timestamp, payload: rawBody });
        const expectedBuf = expected ? Buffer.from(expected) : null;
        const receivedBuf = Buffer.from(signatureHeader.signature);

        if (!expectedBuf || expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
            Sentry.captureMessage("run-task signature mismatch", { level: "warning", tags: { area: "webhook" }, extra: { requestId } });
            return apiResponse.error("SIGNATURE_MISMATCH", "signature_mismatch", 401, undefined, requestId);
        }

        const replayKey = `webhook:run-task:replay:${signatureHeader.signature}`;
        const isFirstSeen = await redis.trySetNx(replayKey, "1", ALLOWED_SKEW_SECONDS);
        if (!isFirstSeen) {
            return apiResponse.error("REPLAY_DETECTED", "replay_detected", 401, undefined, requestId);
        }

        // Signature verified; proceed with JSON parsing
        let body: UntypedJson;
        try {
            body = JSON.parse(rawBody || "{}");
        } catch {
            return apiResponse.badRequest("Invalid JSON body", "INVALID_JSON");
        }
        const parsedBody = taskWebhookBodySchema.safeParse(body);
        if (!parsedBody.success) {
            return apiResponse.validationError(parsedBody.error);
        }
        const { taskId } = parsedBody.data;

        logger.debug(`[Webhook] Received trigger for task ${taskId}`, { requestId });

        // We need the user_id to run the task. 
        // Since this is a system trigger, we can fetch the task to get the user_id.
        const supabase = getSupabaseAdminClient();
        const { data: task, error } = await supabase
            .from("agent_tasks")
            .select("user_id")
            .eq("id", taskId)
            .single();

        if (error || !task) {
            logger.error(`[Webhook] Task ${taskId} not found`, { requestId });
            Sentry.captureMessage("run-task task not found", { level: "warning", tags: { area: "webhook" }, extra: { requestId, taskId } });
            return apiResponse.notFound("Task not found");
        }

        // Trigger the task execution
        await runTaskNowForUser(task.user_id, taskId, supabase);

        return apiResponse.success({ success: true, requestId });
    } catch (error) {
        logger.error("[Webhook] Error processing trigger:", error, { requestId });
        Sentry.captureException(error, { tags: { area: "webhook" }, extra: { requestId } });
        return apiResponse.internalError("Internal server error", requestId);
    }
}
