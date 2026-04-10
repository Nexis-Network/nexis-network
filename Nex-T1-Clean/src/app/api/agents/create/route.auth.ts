import type { NextRequest } from "next/server";

import { createErrorResponse } from "@/lib/request-utils";
import {
  resolveAuthenticatedSupabaseUser,
  type AuthenticatedSupabaseUser,
} from "@/server/api/helpers/auth-guard";

type AgentCreateAuthResult =
  | { ok: true; auth: AuthenticatedSupabaseUser }
  | { ok: false; response: Response };

export async function requireAgentCreateAuth(req: NextRequest): Promise<AgentCreateAuthResult> {
  const auth = await resolveAuthenticatedSupabaseUser(req);
  if (auth.ok) {
    return auth;
  }

  if (auth.reason === "supabase_unavailable") {
    return {
      ok: false,
      response: createErrorResponse(new Error("supabase_unconfigured"), {
        status: 500,
        customMessage: "Supabase not configured",
        headers: { "X-Correlation-Id": auth.correlationId },
      }),
    };
  }

  return {
    ok: false,
    response: createErrorResponse(new Error("unauthorized"), {
      status: 401,
      customMessage: "Unauthorized",
      headers: { "X-Correlation-Id": auth.correlationId },
    }),
  };
}
