import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { requireCsrf } from "@/lib/server/csrf";

export type ServiceProxyConfig = {
  baseUrl?: string;
  serviceName: string;
  pathSegments?: string[];
  headers?: Record<string, string>;
};

function buildTargetUrl(baseUrl: string, pathSegments: string[] | undefined, search: string) {
  const trimmedBase = baseUrl.replace(/\/$/, "");
  const path = pathSegments && pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";
  return `${trimmedBase}${path}${search}`;
}

export async function proxyServiceRequest(
  request: NextRequest,
  config: ServiceProxyConfig,
): Promise<NextResponse> {
  if (!config.baseUrl) {
    return NextResponse.json(
      {
        error: `${config.serviceName} service is not configured`,
      },
      { status: 501 },
    );
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;
  }

  const targetUrl = buildTargetUrl(config.baseUrl, config.pathSegments, new URL(request.url).search);
  const headers = new Headers();
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      headers.set(key, value);
    }
  }

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const apiKey = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > 0) {
      body = buffer;
    }
  }

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const upstreamContentType = upstreamResponse.headers.get("content-type");
  if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
