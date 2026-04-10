import { createUIMessageStreamResponse } from "ai";
import { NextRequest } from "next/server";

import { tools } from "@/lib";
import {
  createCompositeRateLimitKey,
  createRateLimitResponse,
  extractClientIP,
  handleRequestRateLimitWithKey,
} from "@/lib/request-utils";
import { requireInternalProtection } from "@/lib/security/csrf";
import { withAuth } from "@/server/security/with-auth";
import { recordAiTelemetry } from "@/server/services/ai-sdk/tool-registry";

import { parseArtifactRouteBody } from "./route.schema";
import {
  buildArtifactPromptContext,
  createArtifactUiStream,
} from "./route.service";

const preferGpt5 = process.env.NEX_PREFER_GPT5 !== "false";
const balancedModel = process.env.NEX_BALANCED_MODEL ?? "gpt-5.4";
const balancedProviderModel = balancedModel.includes("/")
  ? balancedModel
  : `openai/${balancedModel}`;

const artifactModel =
  process.env.NEX_ARTIFACT_MODEL ??
  (preferGpt5 ? "openai/gpt-5.4" : balancedProviderModel);

export const maxDuration = 30;

function createInvalidJsonResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "INVALID_JSON_BODY",
        message: "Request body must be valid JSON with a messages array.",
        status: 400,
      },
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function POST(req: NextRequest) {
  const guard = requireInternalProtection(req);
  if (guard) {
    return guard;
  }

  const auth = await withAuth(req, { requireOrg: true });
  if (!auth.ok) {
    return auth.response;
  }

  const rateKey = createCompositeRateLimitKey({
    clientIP: extractClientIP(req),
    route: "ai-artifact",
    orgId: auth.orgId,
    userId: auth.session?.user.id ?? null,
  });
  const rateLimitResult = await handleRequestRateLimitWithKey(rateKey);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.errorResponse);
  }

  let body: UntypedJson;
  try {
    body = await req.json();
  } catch {
    return createInvalidJsonResponse();
  }

  const parsedBody = await parseArtifactRouteBody(body);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const startedAt = Date.now();
  const promptContext = await buildArtifactPromptContext(parsedBody.messages);
  const stream = createArtifactUiStream({
    artifactModel,
    messages: parsedBody.messages,
    systemPrompt: promptContext.systemPrompt,
    tools,
  });

  recordAiTelemetry({
    model: artifactModel,
    tools: Object.keys(tools),
    orgId: auth.orgId,
    userId: auth.session?.user.id,
    latencyMs: Date.now() - startedAt,
    modelRoute: "artifact",
    success: true,
  });

  return createUIMessageStreamResponse({
    stream,
    headers: rateLimitResult.rateLimitResult.headers,
  });
}
