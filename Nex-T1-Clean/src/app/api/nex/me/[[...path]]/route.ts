import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { nexFetch, type HttpMethod } from "@/server/api/nex-client";
import { createNexProxyHandlers } from "@/server/api/helpers/nex-proxy";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { composeUpstreamHeaders } from "@/server/security/forward-headers";
import { redis } from "@/server/services/redis";
import { createHash } from "crypto";
import {
  createNexMeFallbackResponse,
  isNexMeFallbackEnabled,
  resolveNexMeFallbackPayload,
  type NexMeFallbackDescriptor,
} from "@/server/api/nex-me-fallback";
import { withTimeoutFallback } from "@/lib/utils/timeout";


import { logger } from '@/lib/logger';

const KNOWN_FALLBACK_REASON_VALUES = ["credits_root", "credits_usage", "bootstrap"] as const;

const forcedFallbackReasons = (() => {
  const raw = process.env.NEX_ME_PROXY_FORCE_FALLBACKS;
  if (raw === undefined) {
    return new Set<NexMeFallbackDescriptor["reason"]>(["credits_root", "credits_usage"]);
  }

  const normalized = raw.trim().toLowerCase();
  if (!normalized || normalized === "none" || normalized === "off") {
    return new Set<NexMeFallbackDescriptor["reason"]>();
  }
  if (normalized === "*" || normalized === "all") {
    return new Set<NexMeFallbackDescriptor["reason"]>(KNOWN_FALLBACK_REASON_VALUES);
  }

  const parsed = normalized
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is NexMeFallbackDescriptor["reason"] =>
      (KNOWN_FALLBACK_REASON_VALUES as readonly string[]).includes(value),
    );

  return new Set(parsed);
})();

const shouldForceFallback = (descriptor: NexMeFallbackDescriptor | null | undefined) =>
  Boolean(descriptor && forcedFallbackReasons.has(descriptor.reason));

function shouldUseFallbackForStatus(status: number) {
  return status === 401 || status === 403 || status === 404 || status >= 500;
}

function commitFallbackIfEnabled(
  cookieBridge: ReturnType<typeof createCookieBridge>,
  descriptor: NexMeFallbackDescriptor,
  _meta: { targetPath: string; method: HttpMethod; upstreamStatus?: number; phase: "upstream" | "local" },
) {
  const forced = shouldForceFallback(descriptor);
  if (!forced && !isNexMeFallbackEnabled()) {
    // logger.error("nex_me_proxy_fallback_suppressed", {
    //   ..._meta,
    //   reason: descriptor.reason,
    // });
    return null;
  }

  // log("nex_me_proxy_fallback", {
  //   ...meta,
  //   reason: descriptor.reason,
  //   forced,
  // });
  return cookieBridge.commit(createNexMeFallbackResponse(descriptor));
}

type PathParams = { path?: string[] };
type ProxyContext = { params?: Promise<PathParams> | PathParams };

async function forward(
  request: Request,
  method: HttpMethod,
  routeContext: ProxyContext,
) {
  const resolvedParams = routeContext.params ? await routeContext.params : { path: undefined };
  const segments = resolvedParams.path ?? [];
  const search = new URL(request.url).search;
  const subPath = segments.length > 0 ? `/${segments.join("/")}` : "";
  const targetPath = `/api/v1/me${subPath}${search}`;

  const jar = await cookies();
  const cookieBridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(cookieBridge, { request });
  const accessToken = context?.accessToken ?? null;

  if (!accessToken) {
    return cookieBridge.commit(apiResponse.unauthorized("Sign in required"));
  }

  const fallbackDescriptor = resolveNexMeFallbackPayload(context ?? null, method, segments);

  if (fallbackDescriptor && method === "GET" && shouldForceFallback(fallbackDescriptor)) {
    const response = commitFallbackIfEnabled(cookieBridge, fallbackDescriptor, {
      targetPath,
      method,
      phase: "local",
    });
    if (response) {
      return response;
    }
  }

  const hasBody = method !== "GET";
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  let body: BodyInit | undefined;
  let forwardContentType: string | undefined;

  try {
    if (hasBody) {
      if (contentType.includes("application/json")) {
        body = await request.json();
        forwardContentType = "application/json";
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await request.formData();
        const params = new URLSearchParams();
        form.forEach((value, key) => {
          if (typeof value === "string") {
            params.append(key, value);
          }
        });
        body = params;
        forwardContentType = "application/x-www-form-urlencoded";
      } else if (contentType.includes("multipart/form-data")) {
        body = await request.formData();
      } else if (contentType) {
        const buffer = await request.arrayBuffer();
        body = buffer;
        forwardContentType = contentType;
      } else {
        const text = await request.text();
        body = text;
      }
    }
  } catch {
    return cookieBridge.commit(apiResponse.badRequest("Failed to read request body"));
  }

  const forwardedHeaders: Record<string, string> = {
    ...(forwardContentType ? { "Content-Type": forwardContentType } : {}),
    ...composeUpstreamHeaders({ cookieBridge, request, includeAuthorization: false, accessToken }),
  };

  try {
    // Micro-cache GET responses for a few seconds to shed load under burst.
    const isCacheableGet = method === "GET" && (segments.length === 0 || segments[0] === "usage");
    const noCacheParam = new URL(request.url).searchParams.get("noCache");
    let cacheKey: string | null = null;
    if (isCacheableGet && accessToken && !noCacheParam) {
      const tokenHash = createHash("sha1").update(accessToken).digest("hex");
      cacheKey = `nexme:v1:${segments.join("/") || "root"}:${tokenHash}`;
      try {
        const cached = await withTimeoutFallback(redis.get<string>(cacheKey), {
          timeoutMs: 500,
          fallback: () => null,
          scope: "nex_me_proxy_cache_read",
        });
        if (cached) {
          return cookieBridge.commit(new Response(cached, {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=10", "X-Cache": "HIT" },
          }));
        }
      } catch { }
    }

    const upstream = await nexFetch(targetPath, {
      method,
      headers: forwardedHeaders,
      body,
      bearer: accessToken,
      timeoutMs: 15000,
    });

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        responseHeaders.append("set-cookie", value);
      } else if (key.toLowerCase() === "content-length") {
        return;
      } else {
        responseHeaders.set(key, value);
      }
    });

    if (!upstream.ok && fallbackDescriptor && shouldUseFallbackForStatus(upstream.status)) {
      const response = commitFallbackIfEnabled(cookieBridge, fallbackDescriptor, {
        targetPath,
        method,
        upstreamStatus: upstream.status,
        phase: "upstream",
      });
      if (response) {
        return response;
      }
    }

    const text = await upstream.text();

    if (cacheKey && upstream.ok) {
      try {
        await withTimeoutFallback(redis.set(cacheKey, text, { ex: 15 }), {
          timeoutMs: 500,
          fallback: () => null,
          scope: "nex_me_proxy_cache_write",
        });
      } catch { }
    }

    return cookieBridge.commit(new Response(text, {
      status: upstream.status,
      headers: responseHeaders,
    }));
  } catch (error) {
    if (fallbackDescriptor) {
      const response = commitFallbackIfEnabled(cookieBridge, fallbackDescriptor, {
        targetPath,
        method,
        phase: "local",
      });
      if (response) {
        return response;
      }
      logger.error("nex_me_local_fallback_suppressed", {
        targetPath,
        method,
        error: error instanceof Error ? error.message : "fallback",
        reason: fallbackDescriptor.reason,
      });
    }
    logger.error("nex_me_proxy_failure", { targetPath, method, error });
    return cookieBridge.commit(apiResponse.error("PROXY_ERROR", "Proxy request failed", 502));
  }
}

const handlers = createNexProxyHandlers(forward);

export const { GET, POST, DELETE, PATCH, PUT } = handlers;
