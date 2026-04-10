import { type NextRequest } from "next/server";

import { apiResponse } from "@/lib/api-platform";
import {
  mapCreateRouteError,
  resolveCreateRouteContext,
} from "@/modules/create/api-route";
import { loadCreateProject } from "@/modules/create/query-service";

import { createProjectIdSchema } from "./route.schema";

type RouteContext = {
  params: Promise<{ projectId: string }>;
};

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
    const project = await loadCreateProject(
      resolved.value.actor,
      parsedProjectId.data,
    );
    return resolved.value.cookieBridge.commit(apiResponse.success({ project }));
  } catch (error) {
    return resolved.value.cookieBridge.commit(mapCreateRouteError(error));
  }
}
