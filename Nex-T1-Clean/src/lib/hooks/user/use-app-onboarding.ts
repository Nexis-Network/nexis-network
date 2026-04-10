"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  APP_ONBOARDING_VERSION,
  buildAppOnboardingMetadataUpdate,
  getAppOnboardingRecordFromProfile,
  shouldShowAppOnboarding,
} from "@/lib/user/onboarding";
import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { trackAgentEvent } from "@/modules/analytics/events";


import { logger } from '@/lib/logger';
function buildLocalStorageKey(userId: number | string) {
  return `nex:app-onboarding:${userId}`;
}

export function useAppOnboardingGuide() {
  const { data: profile } = useProfileAggregate();
  const queryClient = useQueryClient();

  const userId = profile?.identity?.userId;
  const metadata = profile?.identity?.metadata ?? null;

  const [localDismissed, setLocalDismissed] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const supabaseClientRef = useRef(getSupabaseBrowserClient());

  useEffect(() => {
    if (!userId) {
      setLocalDismissed(true);
      setStorageReady(true);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const key = buildLocalStorageKey(userId);
    const stored = window.localStorage.getItem(key);
    setLocalDismissed(stored === "dismissed");
    setStorageReady(true);
  }, [userId]);

  const record = useMemo(() => getAppOnboardingRecordFromProfile(profile), [profile]);

  const shouldShow = useMemo(() => {
    // Dev override
    if (process.env.NEXT_PUBLIC_FORCE_ONBOARDING === "true") {
      return true;
    }

    if (!userId || !storageReady) {
      return false;
    }
    return shouldShowAppOnboarding({
      record,
      localDismissed,
      version: APP_ONBOARDING_VERSION,
    });
  }, [localDismissed, record, storageReady, userId]);

  const persistStatus = useCallback(
    async (status: "completed" | "dismissed") => {
      if (!userId) return;
      try {
        const supabase = supabaseClientRef.current;
        const updatedMetadata = buildAppOnboardingMetadataUpdate(metadata as Record<string, UntypedJson> | null | undefined, {
          status,
          version: APP_ONBOARDING_VERSION,
        });
        await supabase.auth.updateUser({ data: updatedMetadata });
        await queryClient.invalidateQueries({
          queryKey: ["profile-aggregate", userId],
          exact: true,
          refetchType: "active",
        });
      } catch (error) {
        logger.warn("app_onboarding_metadata_update_failed", error);
      }
    },
    [metadata, queryClient, userId],
  );

  const markStatus = useCallback(
    async (status: "completed" | "dismissed") => {
      if (!userId) {
        return;
      }
      if (typeof window !== "undefined") {
        const key = buildLocalStorageKey(userId);
        window.localStorage.setItem(key, "dismissed");
      }
      setLocalDismissed(true);
      trackAgentEvent(`app_onboarding_${status}`, { version: APP_ONBOARDING_VERSION });
      await persistStatus(status);
    },
    [persistStatus, userId],
  );

  return {
    profile,
    record,
    shouldShow,
    markCompleted: useCallback(() => markStatus("completed"), [markStatus]),
    markDismissed: useCallback(() => markStatus("dismissed"), [markStatus]),
  };
}


