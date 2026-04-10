import { type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import {
  mapCreateRouteError,
  resolveCreateRouteContext,
} from "@/modules/create/api-route";
import { sendCreateMessage } from "@/modules/create/mutation-service";
import {
  loadCreateProjectMessages,
  serializeCreateMessages,
  serializeCreateProject,
} from "@/modules/create/query-service";
import { createFollowUpStreamResponse } from "@/modules/create/streaming";

import { createProjectIdSchema } from "../route.schema";
import { createMessageRequestSchema } from "./route.schema";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

export const maxDuration = 120;

export async function GET(request: NextRequest, context: RouteContext) {
  const resolved = await resolveCreateRouteContext(request);
  if (!resolved.ok) {
    return resolved.response;
  }

  const { projectId } = await context.params;
  const parsedProjectId = createProjectIdSchema.safeParse(projectId);
  if (!parsedProjectId.success) {
    return resolved.value.cookieBridge.commit(
      apiResponse.badRequest("Invalid project id.", "INVALID_PROJECT_ID"),
    );
  }

  try {
    const messages = await loadCreateProjectMessages(
      resolved.value.actor,
      parsedProjectId.data,
    );
    return resolved.value.cookieBridge.commit(apiResponse.success({ messages }));
  } catch (error) {
    return resolved.value.cookieBridge.commit(mapCreateRouteError(error));
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const resolved = await resolveCreateRouteContext(request);
  if (!resolved.ok) {
    return resolved.response;
  }

  const { projectId } = await context.params;
  const parsedProjectId = createProjectIdSchema.safeParse(projectId);
  if (!parsedProjectId.success) {
    return resolved.value.cookieBridge.commit(
      apiResponse.badRequest("Invalid project id.", "INVALID_PROJECT_ID"),
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resolved.value.cookieBridge.commit(
      apiResponse.badRequest("Invalid JSON body."),
    );
  }

  const parsed = createMessageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return resolved.value.cookieBridge.commit(
      apiResponse.validationError(parsed.error),
    );
  }

  if (resolved.value.actor.kind === "anonymous") {
    return resolved.value.cookieBridge.commit(
      apiResponse.unauthorized("Start a project before sending follow-up prompts."),
    );
  }

  try {
    if (parsed.data.stream) {
      const response = await createFollowUpStreamResponse({
        actor: resolved.value.actor,
        projectId: parsedProjectId.data,
        prompt: parsed.data.prompt,
      });
      return resolved.value.cookieBridge.commit(response);
    }

    const result = await sendCreateMessage({
      actor: resolved.value.actor,
      projectId: parsedProjectId.data,
      prompt: parsed.data.prompt,
    });

    const response = apiResponse.success({
      messages: serializeCreateMessages(result.messages),
      project: serializeCreateProject(result.project),
    });

    Object.entries(result.rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return resolved.value.cookieBridge.commit(response);
  } catch (error) {
    return resolved.value.cookieBridge.commit(mapCreateRouteError(error));
  }
}
