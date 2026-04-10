"use client";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";

type ServerSessionReadyState = {
  isLoading: boolean;
  isReady: boolean;
};

function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

function isNonProductionTestMode(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return (
    (typeof window !== "undefined" &&
      (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.E2E_TEST_MODE === "true"
  );
}

/**
 * Derives server-session readiness from the auth provider context instead of
 * making a separate `/api/auth/session` fetch. The provider already fetches
 * and verifies the session on mount, so this avoids a redundant network call.
 */
export function useServerSessionReady(): ServerSessionReadyState {
  const { status, serverSessionReady } = useSupabaseAuth();
  const devAuthBypass = isDevAuthBypassEnabled();
  const testMode = isNonProductionTestMode();

  if (testMode) {
    return { isLoading: false, isReady: true };
  }

  if (devAuthBypass) {
    return { isLoading: false, isReady: false };
  }

  return {
    isLoading: status === "loading",
    isReady: status === "authenticated" && serverSessionReady,
  };
}
