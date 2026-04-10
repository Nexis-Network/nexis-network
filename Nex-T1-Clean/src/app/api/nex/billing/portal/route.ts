import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { nexFetch } from "@/server/api/nex-client";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { composeUpstreamHeaders } from "@/server/security/forward-headers";

export async function POST(req: Request) {
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request: req });
  const bearer = context?.accessToken ?? null;
  if (!bearer) return cookieBridge.commit(apiResponse.unauthorized());

  let body: UntypedJson;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return cookieBridge.commit(apiResponse.badRequest("Invalid JSON body"));
  }

  const headers = composeUpstreamHeaders({ cookieBridge, request: req, includeAuthorization: false, accessToken: bearer });
  const upstream = await nexFetch("/api/v1/billing/portal", { bearer, headers, method: "POST", body });
  const text = await upstream.text();
  return cookieBridge.commit(new Response(text, { status: upstream.status }));
}
