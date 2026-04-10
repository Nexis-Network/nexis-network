import { NextRequest } from "next/server";

const PUBLIC_ORIGIN_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "SITE_URL",
  "VERCEL_URL",
] as const;

/**
 * Normalizes a candidate URL string into a valid origin.
 * Prevents forcing HTTPS on localhost to avoid "SSL Error" or "Unauthorized" loops in dev.
 */
function normalizeOrigin(candidate: string | null | undefined): string | null {
  const trimmed = candidate?.trim();
  if (!trimmed) return null;

  // If protocol is present, trust it
  if (/^https?:\/\//iu.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return null;
    }
  }

  // If missing protocol, check for localhost/IP
  const isLocal =
    trimmed.includes("localhost") ||
    trimmed.includes("127.0.0.1") ||
    trimmed.endsWith(".local");

  const protocol = isLocal ? "http" : "https";
  try {
    return new URL(`${protocol}://${trimmed}`).origin;
  } catch {
    return null;
  }
}

/**
 * Resolve the public-facing app origin.
 * In production, we explicitly force the domain to avoid any internal/container URL issues.
 * This is critical because when running inside Railway containers, request.url will have
 * the internal container origin (like http://internal:5173), not the public domain.
 */
export function resolvePublicAppOrigin(request?: NextRequest): string {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return "https://nex-t1.ai";
  }

  const requestOrigin = request
    ? (() => {
        try {
          return new URL(request.url).origin;
        } catch {
          return null;
        }
      })()
    : null;

  const isLocalOrigin = (origin: string | null): boolean => {
    if (!origin) return false;
    try {
      const { hostname } = new URL(origin);
      return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    } catch {
      return false;
    }
  };

  if (isLocalOrigin(requestOrigin)) {
    return requestOrigin!;
  }

  for (const key of PUBLIC_ORIGIN_ENV_KEYS) {
    const normalized = normalizeOrigin(process.env[key]);
    if (!normalized) continue;
    if (requestOrigin && isLocalOrigin(normalized)) continue;
    return normalized;
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  return "http://localhost:3000";
}

import { NextResponse } from "next/server";

export function buildAuthErrorRedirect(origin: string, error: string) {
  return NextResponse.redirect(new URL(`/auth/error?error=${error}`, origin));
}
