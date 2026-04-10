import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { nexFetch } from "@/server/api/nex-client";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { composeUpstreamHeaders } from "@/server/security/forward-headers";

const isDevEnvironment = process.env.NODE_ENV !== "production";

const DEV_FALLBACK_PLAN = Object.freeze({
  product: "Developer Sandbox",
  price: "$0.00",
  interval: "monthly",
  status: "inactive",
  renewsAt: null,
});

export async function GET(req: Request) {
  await connection();
  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request: req });
  const bearer = context?.accessToken ?? null;

  if (!bearer) {
    if (isDevEnvironment) {
      return cookieBridge.commit(apiResponse.success(DEV_FALLBACK_PLAN));
    }
    return cookieBridge.commit(apiResponse.unauthorized());
  }

  const headers = composeUpstreamHeaders({ cookieBridge, request: req, includeAuthorization: false, accessToken: bearer });
  const upstream = await nexFetch("/api/v1/billing/plan", { bearer, headers });
  const text = await upstream.text();

  let payload: UntypedJson = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (upstream.status === 404) {
    return cookieBridge.commit(apiResponse.success(null));
  }

  if (upstream.status === 401 || upstream.status === 403) {
    if (isDevEnvironment) {
      return cookieBridge.commit(apiResponse.success(DEV_FALLBACK_PLAN));
    }
    return cookieBridge.commit(apiResponse.error("UPSTREAM_ERROR", "Unauthorized", upstream.status, payload));
  }

  if (!upstream.ok) {
    return cookieBridge.commit(apiResponse.error("UPSTREAM_ERROR", "Unable to load plan", upstream.status, payload));
  }

  return cookieBridge.commit(apiResponse.success(payload));
}
