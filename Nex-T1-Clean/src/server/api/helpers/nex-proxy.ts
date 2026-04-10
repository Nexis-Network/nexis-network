import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { getErrorMessage } from "@/lib/utils/error";
import { nexFetch, type HttpMethod } from "@/server/api/nex-client";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { composeUpstreamHeaders } from "@/server/security/forward-headers";
import { withAuth } from "@/server/security/with-auth";

type PathParams = { path?: string[] };

/**
 * Context type for proxy handlers - params is always a Promise in Next.js 15.2+
 */
type ProxyContext = {
  params?: Promise<PathParams>;
};

type NexProxyOptions = {
  pathPrefix: string;
  requireOrg?: boolean;
  timeoutMs?: number;
  errorMessage?: string;
};

/**
 * Next.js 15.2+ route handler context type
 * The params field MUST be Promise<PathParams> to satisfy Next.js type requirements
 */
type NextRouteContext = {
  params: Promise<PathParams>;
};

export const createNexProxyHandlers = (
  forward: (request: Request, method: HttpMethod, context: ProxyContext) => Promise<Response>,
) => {
  const makeHandler = (method: HttpMethod) =>
    (request: Request, context: NextRouteContext) => forward(request, method, { params: context.params });

  return {
    GET: makeHandler("GET"),
    POST: makeHandler("POST"),
    DELETE: makeHandler("DELETE"),
    PATCH: makeHandler("PATCH"),
    PUT: makeHandler("PUT"),
  } as const;
};

const DEFAULT_ERROR = "NEX request failed";

const resolveParams = async (params?: Promise<PathParams> | PathParams): Promise<PathParams> =>
  params ? await params : {};

const readBody = async (request: Request, hasBody: boolean) => {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!hasBody) {
    return { body: undefined as BodyInit | undefined, forwardContentType: undefined as string | undefined };
  }

  if (contentType.includes("application/json")) {
    return { body: await request.json(), forwardContentType: "application/json" as const };
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const params = new URLSearchParams();
    form.forEach((value, key) => {
      if (typeof value === "string") {
        params.append(key, value);
      }
    });
    return { body: params, forwardContentType: "application/x-www-form-urlencoded" as const };
  }

  if (contentType.includes("multipart/form-data")) {
    return { body: await request.formData(), forwardContentType: undefined };
  }

  if (contentType) {
    const buffer = await request.arrayBuffer();
    return { body: buffer, forwardContentType: contentType };
  }

  const text = await request.text();
  return { body: text, forwardContentType: undefined };
};

export async function forwardNexProxy(
  request: Request,
  method: HttpMethod,
  context: ProxyContext,
  options: NexProxyOptions,
): Promise<Response> {
  const params = await resolveParams(context.params);
  const segments = params.path ?? [];
  const search = new URL(request.url).search;
  const subPath = segments.length > 0 ? `/${segments.join("/")}` : "";
  const targetPath = `${options.pathPrefix}${subPath}${search}`;

  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const auth = await withAuth(request, { requireOrg: options.requireOrg ?? false });
  if (!auth.ok) {
    return cookieBridge.commit(auth.response);
  }

  const bearer = auth.session?.accessToken ?? null;
  if (!bearer) {
    return cookieBridge.commit(apiResponse.unauthorized("Sign in required"));
  }

  let body: BodyInit | undefined;
  let forwardContentType: string | undefined;

  try {
    const parsed = await readBody(request, method !== "GET");
    body = parsed.body;
    forwardContentType = parsed.forwardContentType;
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.badRequest(getErrorMessage(error, "Failed to read request body")),
    );
  }

  const forwardedHeaders: Record<string, string> = {
    ...composeUpstreamHeaders({ cookieBridge, request, includeAuthorization: false, accessToken: bearer }),
  };

  if (auth.orgId) {
    forwardedHeaders["x-org-id"] = auth.orgId;
  }

  const csrf = request.headers.get("x-csrf-token");
  if (csrf) {
    forwardedHeaders["X-CSRF-Token"] = csrf;
  }
  if (forwardContentType) {
    forwardedHeaders["Content-Type"] = forwardContentType;
  }

  try {
    const upstream = await nexFetch(targetPath, {
      method,
      headers: forwardedHeaders,
      body,
      bearer,
      timeoutMs: options.timeoutMs ?? 15000,
    });

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("Content-Type", upstreamContentType);
    }

    return cookieBridge.commit(
      new Response(await upstream.text(), {
        status: upstream.status,
        headers: responseHeaders,
      }),
    );
  } catch (error) {
    return cookieBridge.commit(
      apiResponse.error("PROXY_ERROR", getErrorMessage(error, options.errorMessage ?? DEFAULT_ERROR), 502),
    );
  }
}
