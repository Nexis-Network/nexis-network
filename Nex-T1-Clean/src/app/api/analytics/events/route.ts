
import { NextRequest } from "next/server";
import { z } from "zod";

import { createSuccessResponse, createErrorResponse, getOrCreateCorrelationId } from "@/lib/request-utils";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { extractSupabaseAuthState, decodeJwtPayload, extractUserIdFromClaims } from "@/server/auth/token-utils";

import { logger } from '@/lib/logger';
const EventSchema = z.object({
  name: z.string().min(1),
  properties: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
});

const CorrelationIdSchema = z.string().uuid();

function ensureFallbackCorrelationId(rawCorrelationId: string): string {
  logger.warn("[analytics:event] invalid correlation id, generating fallback", rawCorrelationId);
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "00000000-0000-0000-0000-000000000000";
}

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const headersToCheck = [
    "x-real-ip",
    "cf-connecting-ip",
    "fastly-client-ip",
    "true-client-ip",
  ];

  for (const header of headersToCheck) {
    const value = req.headers.get(header);
    if (value) {
      return value;
    }
  }

  return null;
};

const resolveUserId = async (req: NextRequest) => {
  try {
    const cookieJar = req.cookies;
    const { accessToken } = extractSupabaseAuthState({ cookieJar, request: req });
    if (!accessToken) {
      return null;
    }
    const claims = decodeJwtPayload(accessToken);
    if (!claims) {
      return null;
    }
    return extractUserIdFromClaims(claims) ?? null;
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  const rawCorrelationId = getOrCreateCorrelationId(req);
  const correlationId = CorrelationIdSchema.safeParse(rawCorrelationId).success
    ? rawCorrelationId
    : ensureFallbackCorrelationId(rawCorrelationId);
  const droppedResponse = () =>
    createSuccessResponse(
      { ok: false, dropped: true },
      { status: 202, headers: { "X-Correlation-Id": correlationId } },
    );

  let raw: UntypedJson;
  try {
    raw = await req.json();
  } catch (error) {
    logger.warn("[analytics:event] invalid JSON payload, dropping event", error);
    return droppedResponse();
  }

  const parsedEvent = EventSchema.safeParse(raw);
  if (!parsedEvent.success) {
    return createErrorResponse(parsedEvent.error, {
      status: 400,
      customMessage: "Invalid analytics payload",
      headers: { "X-Correlation-Id": correlationId },
    });
  }

  const event = parsedEvent.data;
  const pathname = new URL(req.url).pathname;
  const userIdPromise = resolveUserId(req);
  const userAgent = req.headers.get("user-agent");
  const referer = req.headers.get("referer");
  const clientIp = getClientIp(req);
  const properties: Record<string, UntypedJson> = { ...(event.properties ?? {}) };
  const sessionId =
    typeof properties.sessionId === "string" ? properties.sessionId : undefined;
  if (sessionId) {
    delete (properties as Record<string, UntypedJson>).sessionId;
  }

  let serviceClient: ReturnType<typeof createServiceRoleClient>;
  try {
    serviceClient = createServiceRoleClient();
  } catch (error) {
    logger.error("[analytics:event] service-role unavailable, dropping event", error);
    return droppedResponse();
  }

  try {
    const { error: insertError } = await serviceClient.from("analytics_event").insert({
      correlation_id: correlationId,
      event_name: event.name,
      properties,
      user_id: await userIdPromise,
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: clientIp,
      referer,
      pathname,
    });

    if (insertError) {
      logger.warn("[analytics:event] insert failed, dropping event:", insertError);
      return droppedResponse();
    }
  } catch (error) {
    logger.error("[analytics:event] insert exception, dropping event", error);
    return droppedResponse();
  }

  logger.info("[analytics:event]", {
    ...event,
    receivedAt: new Date().toISOString(),
    correlationId,
  });

  return createSuccessResponse({ ok: true }, { headers: { "X-Correlation-Id": correlationId } });
}
