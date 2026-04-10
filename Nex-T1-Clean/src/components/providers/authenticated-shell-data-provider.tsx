"use client";

import { useMemo, type ReactNode } from "react";

import { useSupabaseAuth } from "@/components/providers/supabase-auth-provider";
import { useServerSessionReady } from "@/lib/hooks/auth/use-server-session-ready";
import { useBilling } from "@/lib/hooks/billing/use-billing";
import { useProfileAggregate } from "@/lib/hooks/user/use-profile-aggregate";
import { AuthenticatedShellDataContext } from "@/lib/hooks/user/authenticated-shell-data";

export function AuthenticatedShellDataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { status } = useSupabaseAuth();
  const serverSession = useServerSessionReady();
  const serverSessionReady = serverSession.isReady;
  const isAuthenticated = status === "authenticated";
  // Start profile + billing queries as soon as auth status is known
  // (don't wait for serverSessionReady — reduces waterfall by ~1-2s)
  const profile = useProfileAggregate({
    enabled: isAuthenticated,
  });
  const billing = useBilling({
    enabled: isAuthenticated,
  });

  const value = useMemo(
    () => ({
      billingLoading:
        status === "authenticated" &&
        (!serverSessionReady || serverSession.isLoading || billing.loading),
      billingPlan: billing.plan,
      profileData: profile.data,
      profileLoading:
        status === "authenticated" &&
        (!serverSessionReady || serverSession.isLoading || profile.isLoading),
      serverSessionReady,
    }),
    [
      billing.loading,
      billing.plan,
      profile.data,
      profile.isLoading,
      serverSession.isLoading,
      serverSessionReady,
      status,
    ],
  );

  return (
    <AuthenticatedShellDataContext.Provider value={value}>
      {children}
    </AuthenticatedShellDataContext.Provider>
  );
}
