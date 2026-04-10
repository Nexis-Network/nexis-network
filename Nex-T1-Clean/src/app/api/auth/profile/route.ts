import { connection, type NextRequest } from "next/server";
import { withAuth } from "@/server/security/with-auth";
import { apiResponse } from "@/lib/api-platform";
import { timeApiRoute } from "@/server/instrumentation/metrics";
import { createClient } from "@/server/services/supabase/server";
import { resolveOnboardingCompleted } from "@/lib/auth/onboarding-status";


import { logger } from '@/lib/logger';

/**
 * GET /api/auth/profile
 * Returns the user's profile data, specifically onboarding status.
 * This server-side route bypasses the Supabase client SDK which may hang
 * when the auth server is unreachable from the browser.
 */
export async function GET(request: NextRequest) {
  await connection();
  return timeApiRoute("auth.profile.GET", async () => {
    let auth: Awaited<ReturnType<typeof withAuth>>;
    try {
      auth = await withAuth(request);
    } catch (error) {
      logger.error("[auth/profile] auth resolution failed:", error);
      return apiResponse.serviceUnavailable(
        "Authentication service unavailable",
        "AUTH_CONTEXT_UNAVAILABLE",
      );
    }

    if (!auth.ok) {
      return auth.response;
    }

    if (!auth.session) {
      return apiResponse.unauthorized();
    }

    const userId = auth.session.user.id;
    const userCreatedAt =
      typeof auth.session.user.created_at === "string"
        ? auth.session.user.created_at
        : null;

    // Mock user bypass: return mock data for test users
    if (userId === "00000000-0000-0000-0000-000000000000") {
      return apiResponse.success({
        id: userId,
        onboarding_completed: true,
      });
    }

    try {
      const supabase = await createClient();
      if (!supabase) {
        return apiResponse.error("DATABASE_UNAVAILABLE", "Database unavailable", 503);
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, onboarding_completed, username, display_name")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        logger.error("[auth/profile] Profile fetch error:", error);
        return apiResponse.success({
          id: userId,
          onboarding_completed: true,
        });
      }

      const onboardingCompleted = resolveOnboardingCompleted({
        profileOnboardingCompleted: profile?.onboarding_completed ?? null,
        userCreatedAt,
      });

      return apiResponse.success({
        id: profile?.id ?? userId,
        onboarding_completed: onboardingCompleted,
      });
    } catch (error) {
      logger.error("[auth/profile] profile fetch fallback:", error);
      return apiResponse.success({
        id: userId,
        onboarding_completed: true,
      });
    }
  });
}
