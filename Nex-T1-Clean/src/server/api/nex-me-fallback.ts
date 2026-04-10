import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-platform";
import type { SupabaseAuthContext } from "@/server/auth/auth-context";
import type { HttpMethod } from "@/server/api/nex-client";

export type NexMeFallbackReason = "credits_root" | "credits_usage" | "bootstrap";

export type NexMeFallbackDescriptor = {
  status: number;
  body: Record<string, UntypedJson>;
  reason: NexMeFallbackReason;
};

const CREDIT_SKELETON = {
  credits: {
    remaining: null as number | null,
    limit: null as number | null,
    used: null as number | null,
  },
  usage: {
    credits: {
      remaining: null as number | null,
      limit: null as number | null,
      used: null as number | null,
    },
  },
} satisfies Record<string, UntypedJson>;

function asRecord(value: UntypedJson): Record<string, UntypedJson> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, UntypedJson>;
  }
  return null;
}

function extractUserSummary(context: SupabaseAuthContext | null) {
  if (!context) {
    return null;
  }
  const session = asRecord(context.session);
  const user = session ? asRecord(session.user) : null;
  const userMetadata =
    user ? asRecord(user.metadata) ?? asRecord(user.user_metadata) ?? asRecord(user.userMeta) : null;
  const profile = userMetadata ? asRecord(userMetadata.profile) : null;

  const displayName =
    [
      profile?.displayName,
      profile?.name,
      user?.display_name,
      user?.displayName,
      user?.username,
      user?.name,
      user?.email,
    ].find((value) => typeof value === "string" && value.trim().length > 0) ?? null;

  const idCandidate =
    context.userId ??
    (typeof user?.id === "string" && user.id.trim().length > 0 ? user.id : null) ??
    (typeof user?.user_id === "string" && user.user_id.trim().length > 0 ? user.user_id : null);

  return {
    id: idCandidate,
    email: typeof user?.email === "string" ? user.email : null,
    displayName,
  };
}

function buildCreditsPayload(context: SupabaseAuthContext | null) {
  return {
    ...CREDIT_SKELETON,
    user: extractUserSummary(context),
    provider: context ? "supabase" : null,
    generatedAt: new Date().toISOString(),
  };
}

function buildBootstrapPayload(context: SupabaseAuthContext | null) {
  return {
    ok: true,
    provider: context ? "supabase" : null,
    generatedAt: new Date().toISOString(),
  };
}

export function resolveNexMeFallbackPayload(
  context: SupabaseAuthContext | null,
  method: HttpMethod,
  segments: string[],
): NexMeFallbackDescriptor | null {
  const normalized = segments.map((segment) => segment?.toLowerCase?.() ?? "");

  if (method === "GET" && normalized.length === 0) {
    return { status: 200, body: buildCreditsPayload(context), reason: "credits_root" };
  }

  if (method === "GET" && normalized[0] === "usage") {
    return { status: 200, body: buildCreditsPayload(context), reason: "credits_usage" };
  }

  if (method === "POST" && normalized[0] === "bootstrap") {
    return { status: 200, body: buildBootstrapPayload(context), reason: "bootstrap" };
  }

  return null;
}

export function createNexMeFallbackResponse(descriptor: NexMeFallbackDescriptor): Response {
  // Use NextResponse.json for success to match existing API contract (no data wrapper)
  const response = descriptor.status === 200 
    ? NextResponse.json(descriptor.body, { status: 200 })
    : apiResponse.error("FALLBACK_ERROR", "Fallback response", descriptor.status, descriptor.body);
    
  response.headers.set("X-Nex-Fallback", descriptor.reason);
  response.headers.set("Cache-Control", "private, max-age=5");
  return response;
}

export function isNexMeFallbackEnabled(): boolean {
  const flag = process.env.NEX_ME_PROXY_FALLBACK?.toLowerCase();
  if (flag === "true") {
    return true;
  }
  if (flag === "false") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}
