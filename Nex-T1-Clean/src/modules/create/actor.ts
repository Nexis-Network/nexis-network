import "server-only";

import type { NextRequest } from "next/server";

import { normalizeSubscriptionTier } from "@/lib/billing/subscription-tier";
import { readCreateGuestSessionId } from "@/modules/create/guest-cookie";
import type { CookieBridge } from "@/server/auth/cookie-bridge";
import type { WithAuthResult } from "@/server/security/with-auth";
import { getSupabaseAdminClient } from "@/server/services/supabase/supabase-admin";

import type { ResolvedCreateActor } from "./types";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function resolveUserPlan(userId: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return normalizeSubscriptionTier(data?.plan);
}

export async function resolveCreateActor(args: {
  auth: WithAuthResult;
  cookieBridge: CookieBridge;
  request: NextRequest;
}): Promise<ResolvedCreateActor> {
  const guestSessionId = readCreateGuestSessionId(args.cookieBridge);
  const ip = getClientIp(args.request);

  if (args.auth.ok && args.auth.session?.user.id && args.auth.orgId) {
    return {
      kind: "user",
      ip,
      userId: args.auth.session.user.id,
      orgId: args.auth.orgId,
      plan: await resolveUserPlan(args.auth.session.user.id),
      guestSessionId,
    };
  }

  if (guestSessionId) {
    return {
      kind: "guest",
      ip,
      guestSessionId,
    };
  }

  return {
    kind: "anonymous",
    ip,
    guestSessionId: null,
  };
}
