import { buildPublicDeveloperOpenApiDocument } from "@/server/services/developer-api/openapi";

import { publicJsonResponse } from "@/app/api/v1/_shared/public-api-response";

export async function GET() {
  return publicJsonResponse(buildPublicDeveloperOpenApiDocument());
}
