import { type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import {
  ensureMutableCreateActor,
  mapCreateRouteError,
  resolveCreateRouteContext,
} from "@/modules/create/api-route";
import {
  createCreateProject,
} from "@/modules/create/mutation-service";
import { enforceCreateProjectQuota } from "@/modules/create/quota";
import {
  loadCreateWorkspace,
  serializeCreateMessages,
  serializeCreateProject,
} from "@/modules/create/query-service";
import { createCreateProjectStreamResponse } from "@/modules/create/streaming";

import { createProjectRequestSchema } from "./route.schema";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const resolved = await resolveCreateRouteContext(request);
  if (!resolved.ok) {
    return resolved.response;
  }

  try {
    const workspace = await loadCreateWorkspace(resolved.value.actor);
    return resolved.value.cookieBridge.commit(apiResponse.success(workspace));
  } catch (error) {
    return resolved.value.cookieBridge.commit(mapCreateRouteError(error));
  }
}

export async function POST(request: NextRequest) {
  const resolved = await resolveCreateRouteContext(request);
  if (!resolved.ok) {
    return resolved.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resolved.value.cookieBridge.commit(
      apiResponse.badRequest("Invalid JSON body."),
    );
  }

  const parsed = createProjectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return resolved.value.cookieBridge.commit(
      apiResponse.validationError(parsed.error),
    );
  }

  let anonymousRateLimitHeaders: Record<string, string> = {};
  if (resolved.value.actor.kind === "anonymous") {
    try {
      anonymousRateLimitHeaders = await enforceCreateProjectQuota(
        resolved.value.actor,
      );
    } catch (error) {
      return resolved.value.cookieBridge.commit(mapCreateRouteError(error));
    }
  }

  const actor = ensureMutableCreateActor(
    resolved.value.actor,
    resolved.value.cookieBridge,
  );

  try {
    if (parsed.data.stream) {
      const response = await createCreateProjectStreamResponse({
        actor,
        prompt: parsed.data.prompt,
        templateId: parsed.data.templateId,
      });
      Object.entries(anonymousRateLimitHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return resolved.value.cookieBridge.commit(response);
    }

    const result = await createCreateProject({
      actor,
      prompt: parsed.data.prompt,
      templateId: parsed.data.templateId,
    });

    const response = apiResponse.created({
      messages: serializeCreateMessages(result.messages),
      project: serializeCreateProject(result.project),
    });

    Object.entries({
      ...anonymousRateLimitHeaders,
      ...result.rateLimitHeaders,
    }).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return resolved.value.cookieBridge.commit(response);
  } catch (error) {
    return resolved.value.cookieBridge.commit(mapCreateRouteError(error));
  }
}
