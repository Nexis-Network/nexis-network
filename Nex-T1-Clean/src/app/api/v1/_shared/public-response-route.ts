import { extractClientIP } from "@/lib/request-utils";
import { authenticatePublicApiKey } from "@/server/security/public-api-key-auth";
import { enforcePublicApiRateLimit } from "@/server/security/public-api-rate-limit";
import { executeDeveloperResponse } from "@/server/services/developer-api/responses-service";
import type {
  DeveloperApiRequest,
  PublicDeveloperProductId,
} from "@/server/services/developer-api/types";

import {
  publicErrorResponse,
  publicJsonResponse,
  publicValidationErrorResponse,
} from "@/app/api/v1/_shared/public-api-response";
import {
  developerResponseSchema,
  pinnedDeveloperResponseSchema,
} from "@/app/api/v1/responses/route.schema";

type PublicResponseOptions = {
  forcedModel?: PublicDeveloperProductId;
  requestKind?: "responses" | "chat.completions";
};

function mergeHeaders(response: Response, headers: Record<string, string>) {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function handlePublicResponseRoute(
  request: Request,
  options: PublicResponseOptions = {},
): Promise<Response> {
  const rawBody = await request.json().catch(() => null);
  let normalizedRequest: DeveloperApiRequest;

  if (options.forcedModel) {
    const parsed = pinnedDeveloperResponseSchema.safeParse(rawBody);
    if (!parsed.success) {
      return publicValidationErrorResponse(parsed.error);
    }

    normalizedRequest = {
      ...parsed.data,
      model: options.forcedModel,
    };
  } else {
    const parsed = developerResponseSchema.safeParse(rawBody);
    if (!parsed.success) {
      return publicValidationErrorResponse(parsed.error);
    }

    normalizedRequest = parsed.data;
  }

  const auth = await authenticatePublicApiKey({
    authorizationHeader: request.headers.get("authorization"),
    productId: normalizedRequest.model,
    requestIp: extractClientIP(request),
  });

  if (!auth.ok) {
    return publicErrorResponse({
      code: auth.code,
      message: auth.message,
      status: auth.status,
    });
  }

  const rateLimit = await enforcePublicApiRateLimit(auth.context);
  if (!rateLimit.ok) {
    return mergeHeaders(
      publicErrorResponse({
        code: rateLimit.code,
        message: rateLimit.message,
        status: rateLimit.status,
      }),
      rateLimit.headers,
    );
  }

  try {
    const result = await executeDeveloperResponse({
      auth: auth.context,
      request: normalizedRequest,
      requestKind: options.requestKind,
    });

    return mergeHeaders(
      mergeHeaders(publicJsonResponse(result.response), result.headers),
      rateLimit.headers,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to execute public developer response.";
    return mergeHeaders(
      publicErrorResponse({
        code: "INTERNAL_ERROR",
        message,
        status: 500,
      }),
      rateLimit.headers,
    );
  }
}
