import { type NextRequest } from "next/server";

import { GET as listApiKeys } from "@/app/api/auth/api-key/list/route";


export async function GET(request: NextRequest) {
  const response = await listApiKeys(request);
  response.headers.set("X-Deprecated-Endpoint", "/api/v1/keys");
  response.headers.set("X-Replacement-Endpoint", "/api/auth/api-key/list");
  return response;
}
