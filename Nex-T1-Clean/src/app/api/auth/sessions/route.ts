import { connection } from "next/server";
import { cookies } from "next/headers";

import { apiResponse } from "@/lib/api-platform";
import { createCookieBridge } from "@/server/auth/cookie-bridge";
import { resolveSupabaseContext } from "@/server/auth/auth-context";
import { createServiceRoleClient } from "@/server/services/supabase/service-role";
import { authLogger } from "@/server/logging/logger";
import { extractClientIP, getOrCreateCorrelationId } from "@/lib/request-utils";


type SessionRevocationAction = "revoke_single" | "revoke_all" | "revoke_others";

/**
 * List all sessions for the authenticated user.
 */
export async function GET(request: Request) {
  await connection();
  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(bridge, { refreshSession: false, request });
  
  if (!context?.userId) {
    return apiResponse.unauthorized();
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_session")
    .select("id, issued_at, last_seen, ip, user_agent, revoked, revoked_at")
    .eq("user_id", context.userId)
    .order("issued_at", { ascending: false });

  if (error) {
    authLogger.error("sessions_list_failed", {
      userId: context.userId,
      error: error.message,
    });
    return apiResponse.internalError(error.message);
  }

  return apiResponse.success({ 
    sessions: data ?? [],
    currentSessionHint: context.claims?.session_id ?? null,
  });
}

/**
 * Revoke sessions for the authenticated user.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const bridge = createCookieBridge(jar);
  const { context } = await resolveSupabaseContext(bridge, { refreshSession: false, request });
  
  if (!context?.userId) {
    return apiResponse.unauthorized();
  }

  let body: {
    action?: SessionRevocationAction;
    sessionId?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Request body must be valid JSON");
  }

  const action = body.action ?? "revoke_single";
  const sessionId = body.sessionId;
  const reason = body.reason ?? "user_requested";
  const clientIp = extractClientIP(request);
  const correlationId = getOrCreateCorrelationId(request);
  const currentSessionId = context.claims?.session_id ?? null;

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const auditContext = {
    userId: context.userId,
    action,
    reason,
    correlationId,
    clientIp,
    currentSessionId,
  };

  try {
    switch (action) {
      case "revoke_single": {
        if (!sessionId) {
          return apiResponse.badRequest("session_id is required");
        }

        const { error, count } = await supabase
          .from("user_session")
          .update({ 
            revoked: true, 
            revoked_at: now,
            revocation_reason: reason,
          })
          .eq("id", sessionId)
          .eq("user_id", context.userId)
          .eq("revoked", false);

        if (error) {
          authLogger.error("session_revoke_failed", { ...auditContext, sessionId, error: error.message });
          return apiResponse.internalError(error.message);
        }

        authLogger.info("session_revoked", { ...auditContext, sessionId, revokedCount: count });
        return apiResponse.success({ ok: true, revokedCount: count ?? 1 });
      }

      case "revoke_all": {
        const { error, count } = await supabase
          .from("user_session")
          .update({ 
            revoked: true, 
            revoked_at: now,
            revocation_reason: reason,
          })
          .eq("user_id", context.userId)
          .eq("revoked", false);

        if (error) {
          authLogger.error("session_revoke_all_failed", { ...auditContext, error: error.message });
          return apiResponse.internalError(error.message);
        }

        try {
          const { error: signOutError } = await supabase.auth.admin.signOut(context.userId, "global");
          if (signOutError) {
            authLogger.warn("supabase_global_signout_failed", { 
              ...auditContext, 
              error: signOutError.message,
            });
          }
        } catch (signOutError) {
          authLogger.warn("supabase_global_signout_exception", { 
            ...auditContext, 
            error: signOutError instanceof Error ? signOutError.message : String(signOutError),
          });
        }

        authLogger.info("sessions_revoked_all", { ...auditContext, revokedCount: count });
        return apiResponse.success({ 
          ok: true, 
          revokedCount: count ?? 0,
          message: "All sessions revoked. You will be logged out everywhere.",
        });
      }

      case "revoke_others": {
        if (!currentSessionId) {
          authLogger.warn("session_revoke_others_no_current_session", auditContext);
          return apiResponse.badRequest("Cannot determine current session. Use revoke_all instead.");
        }

        const { error, count } = await supabase
          .from("user_session")
          .update({ 
            revoked: true, 
            revoked_at: now,
            revocation_reason: reason,
          })
          .eq("user_id", context.userId)
          .eq("revoked", false)
          .neq("id", currentSessionId);

        if (error) {
          authLogger.error("session_revoke_others_failed", { ...auditContext, error: error.message });
          return apiResponse.internalError(error.message);
        }

        authLogger.info("sessions_revoked_others", { ...auditContext, revokedCount: count });
        return apiResponse.success({ 
          ok: true, 
          revokedCount: count ?? 0,
          message: "All other sessions revoked. Your current session remains active.",
        });
      }

      default:
        return apiResponse.badRequest("Invalid action. Valid: revoke_single, revoke_all, revoke_others");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Session revocation failed";
    authLogger.error("session_revoke_exception", { ...auditContext, error: message });
    return apiResponse.internalError(message);
  }
}
