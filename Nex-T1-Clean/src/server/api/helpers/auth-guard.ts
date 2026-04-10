import { NextResponse, type NextRequest } from "next/server";

import { createErrorResponse, getOrCreateCorrelationId } from "@/lib/request-utils";
import { extractSupabaseAuthState } from "@/server/auth/token-utils";
import { getSupabaseServerClient } from "@/server/services/supabase/supabaseClient";

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>;
type CookieEntry = { name: string; value: string };
type CookieJar = { getAll(): CookieEntry[] };

export type AuthenticatedSupabaseUser = {
  supabase: SupabaseServerClient;
  userId: string;
  correlationId: string;
};

type AuthFailureReason = "supabase_unavailable" | "unauthenticated";

export type AuthGuardResult =
  | { ok: true; auth: AuthenticatedSupabaseUser }
  | { ok: false; reason: AuthFailureReason; correlationId: string };

function generateCorrelationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `auth-${Date.now()}`;
}

function buildCookieJar(request?: NextRequest | Request): CookieJar {
  if (request && "cookies" in request && request.cookies && typeof request.cookies.getAll === "function") {
    return {
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
    };
  }

  return {
    getAll: () => parseCookieHeader(request?.headers?.get("cookie") ?? null),
  };
}

function parseCookieHeader(rawCookieHeader: string | null): CookieEntry[] {
  if (!rawCookieHeader) {
    return [];
  }

  return rawCookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        name: entry.slice(0, separatorIndex).trim(),
        value: entry.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((entry): entry is CookieEntry => Boolean(entry?.name));
}

export async function resolveAuthenticatedSupabaseUser(
  request?: NextRequest | Request,
): Promise<AuthGuardResult> {
  const correlationId = request ? getOrCreateCorrelationId(request) : generateCorrelationId();
  const { accessToken } = extractSupabaseAuthState({
    cookieJar: buildCookieJar(request),
    request: request ?? null,
  });

  const supabase = await getSupabaseServerClient({ accessToken });
  if (!supabase) {
    return { ok: false, reason: "supabase_unavailable", correlationId };
  }

  const { data, error } = await supabase.auth.getUser(accessToken ?? undefined);
  if (error || !data?.user?.id) {
    return { ok: false, reason: "unauthenticated", correlationId };
  }

  return {
    ok: true,
    auth: {
      supabase,
      userId: data.user.id,
      correlationId,
    },
  };
}

export function toUnauthorizedJsonResponse(_result: Extract<AuthGuardResult, { ok: false }>): Response {
  // Keep legacy behavior for helpers that should always return 401 JSON.
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function toStandardErrorResponse(result: Extract<AuthGuardResult, { ok: false }>): Response {
  if (result.reason === "supabase_unavailable") {
    return createErrorResponse(new Error("Supabase not configured"), {
      status: 500,
      headers: { "X-Correlation-Id": result.correlationId },
    });
  }

  return createErrorResponse(new Error("Unauthenticated"), {
    status: 401,
    headers: { "X-Correlation-Id": result.correlationId },
  });
}
