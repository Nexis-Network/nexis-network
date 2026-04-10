import { handlePublicResponseRoute } from "@/app/api/v1/_shared/public-response-route";

export async function POST(request: Request) {
  return handlePublicResponseRoute(request, {
    forcedModel: "nex-t1-instant",
    requestKind: "responses",
  });
}
