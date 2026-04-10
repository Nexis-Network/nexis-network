"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { createEmptyProfile, fetchProfileAggregate, normalizeProfileAggregate, ProfileAggregate } from "@/lib/user/profile";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { useServerSessionReady } from "@/lib/hooks/auth/use-server-session-ready";
import { useProfileAggregateRealtime } from "@/hooks/use-profile-aggregate-realtime";

type UseProfileAggregateOptions = {
  initialData?: ProfileAggregate;
  enabled?: boolean;
};

type TestWindow = Window & {
  __TEST_MODE?: boolean;
  __TEST_PROFILE_AGGREGATE__?: Partial<ProfileAggregate>;
};

function normalizeMaybeProfileAggregate(value: unknown): ProfileAggregate | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  return normalizeProfileAggregate(value as UntypedJson);
}

export function useProfileAggregate(options: UseProfileAggregateOptions = {}) {
  const { session, status, user } = useAuthContext();
  const isDev = process.env.NODE_ENV !== "production";
  const devAuthBypass = isDev && process.env.DEV_AUTH_BYPASS === "true";
  const isTestMode = isDev && (
    (typeof window !== "undefined" && (window as Window & { __TEST_MODE?: boolean }).__TEST_MODE === true) ||
    process.env.NEXT_PUBLIC_TEST_MODE === "true" ||
    process.env.E2E_TEST_MODE === "true"
  );
  const serverReportedTestMode =
    ((session as { metadata?: { source?: string } } | null)?.metadata?.source ??
      null) === "test-mode";
  const { isReady: serverSessionReady } = useServerSessionReady();
  const isAuthenticated = status === "authenticated" && Boolean(user);
  const allowClientProfileHydration =
    serverSessionReady ||
    devAuthBypass ||
    isTestMode ||
    serverReportedTestMode;
  const shouldFetchProfile =
    isAuthenticated && allowClientProfileHydration && options.enabled !== false;
  const shouldSubscribeRealtime =
    isAuthenticated && serverSessionReady && options.enabled !== false;
  const queryClient = useQueryClient();
  const profileKey = useMemo(
    () => ["profile-aggregate", isAuthenticated ? user?.id ?? "unknown" : "guest"],
    [isAuthenticated, user?.id],
  );

  const cached = isAuthenticated ? normalizeMaybeProfileAggregate(queryClient.getQueryData(profileKey)) : undefined;
  const normalizedInitialData = normalizeMaybeProfileAggregate(options.initialData);
  const invalidateProfile = useCallback(() => {
    if (!user?.id) return;
    void queryClient.invalidateQueries({
      queryKey: ["profile-aggregate", user.id],
    });
  }, [queryClient, user?.id]);

  useProfileAggregateRealtime({
    enabled: shouldSubscribeRealtime,
    onNotify: invalidateProfile,
    userId: user?.id,
  });

  // Mock for Test Mode or Dev Bypass
  // SECURITY: All bypass checks gated behind isDev to prevent production exploitation

  return useQuery<ProfileAggregate>({
    queryKey: profileKey,
    queryFn: async (_ctx) => {
      if (isTestMode || devAuthBypass || serverReportedTestMode) {
        const baseProfile = createEmptyProfile();
        const seededProfile =
          typeof window !== "undefined"
            ? (window as TestWindow).__TEST_PROFILE_AGGREGATE__
            : undefined;

        if (seededProfile && typeof seededProfile === "object") {
          return normalizeProfileAggregate({
            ...baseProfile,
            ...seededProfile,
            identity: {
              ...baseProfile.identity,
              ...(seededProfile.identity ?? {}),
            },
          } as UntypedJson);
        }

        return normalizeProfileAggregate({
          ...baseProfile,
          identity: {
            ...baseProfile.identity,
            email: "dev@example.com",
            displayName: "Dev User",
          },
        } as UntypedJson);
      }
      const profile = await fetchProfileAggregate();
      return normalizeProfileAggregate(profile as UntypedJson);
    },
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    refetchOnReconnect: "always",
    enabled: shouldFetchProfile,
    select: (data) => normalizeProfileAggregate(data as UntypedJson),
    initialData: isAuthenticated ? cached ?? normalizedInitialData : undefined,
    placeholderData: cached,
    meta: { persist: true },
  });
}
