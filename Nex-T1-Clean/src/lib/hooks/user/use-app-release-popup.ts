"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useProfileAggregate } from "@/hooks/user/use-profile-aggregate";
import { logger } from "@/lib/logger";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  APP_RELEASE_POPUP_VERSION,
  type AppReleasePopupRecord,
  buildAppReleasePopupMetadataUpdate,
  extractAppReleasePopupRecord,
  getAppReleasePopupRecordFromProfile,
  getEligibleAppReleasePopupImpression,
  mergeAppReleasePopupRecords,
  recordAppReleasePopupImpression,
} from "@/lib/user/app-release-popup";
import { trackAgentEvent } from "@/modules/analytics/events";

function buildLocalStorageKey(userId: number | string) {
  return `nex:app-release-popup:${userId}`;
}

function readLocalRecord(key: string): AppReleasePopupRecord {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as Record<string, UntypedJson>;
    return extractAppReleasePopupRecord(parsed);
  } catch {
    return {};
  }
}

function writeLocalRecord(key: string, record: AppReleasePopupRecord) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Ignore storage failures in private browsing or constrained environments.
  }
}

export function useAppReleasePopup() {
  const { data: profile } = useProfileAggregate();
  const queryClient = useQueryClient();
  const supabaseClientRef = useRef(getSupabaseBrowserClient());

  const userId = profile?.identity?.userId;
  const metadata = profile?.identity?.metadata ?? null;

  const [localRecord, setLocalRecord] = useState<AppReleasePopupRecord>({});
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLocalRecord({});
      setStorageReady(true);
      return;
    }

    const key = buildLocalStorageKey(userId);
    setLocalRecord(readLocalRecord(key));
    setStorageReady(true);
  }, [userId]);

  const profileRecord = useMemo(
    () => getAppReleasePopupRecordFromProfile(profile),
    [profile],
  );

  const record = useMemo(
    () =>
      mergeAppReleasePopupRecords(
        localRecord,
        profileRecord,
        APP_RELEASE_POPUP_VERSION,
      ),
    [localRecord, profileRecord],
  );

  const eligibleImpression = useMemo(() => {
    if (!userId || !storageReady) {
      return null;
    }

    return getEligibleAppReleasePopupImpression({
      record,
      version: APP_RELEASE_POPUP_VERSION,
      now: Date.now(),
    });
  }, [record, storageReady, userId]);

  const persistImpression = useCallback(
    async (impression: 1 | 2, timestamp: string) => {
      if (!userId) {
        return;
      }

      try {
        const supabase = supabaseClientRef.current;
        const updatedMetadata = buildAppReleasePopupMetadataUpdate(
          metadata as Record<string, UntypedJson> | null | undefined,
          {
            impression,
            timestamp,
            version: APP_RELEASE_POPUP_VERSION,
          },
        );

        await supabase.auth.updateUser({ data: updatedMetadata });
        await queryClient.invalidateQueries({
          queryKey: ["profile-aggregate", userId],
          exact: true,
          refetchType: "active",
        });
      } catch (error) {
        logger.warn("app_release_popup_metadata_update_failed", error);
      }
    },
    [metadata, queryClient, userId],
  );

  const markShown = useCallback(
    async (impression: 1 | 2) => {
      if (!userId) {
        return;
      }

      const timestamp = new Date().toISOString();
      const nextRecord = recordAppReleasePopupImpression(record, {
        impression,
        timestamp,
        version: APP_RELEASE_POPUP_VERSION,
      });

      const key = buildLocalStorageKey(userId);
      writeLocalRecord(key, nextRecord);
      setLocalRecord(nextRecord);

      trackAgentEvent("app_release_popup_shown", {
        version: APP_RELEASE_POPUP_VERSION,
        impression,
      });

      await persistImpression(impression, timestamp);
    },
    [persistImpression, record, userId],
  );

  const markDismissed = useCallback(
    (impression: 1 | 2 | null) => {
      if (!impression) {
        return;
      }

      trackAgentEvent("app_release_popup_dismissed", {
        version: APP_RELEASE_POPUP_VERSION,
        impression,
      });
    },
    [],
  );

  return {
    eligibleImpression,
    isReady: storageReady,
    record,
    version: APP_RELEASE_POPUP_VERSION,
    markDismissed,
    markShown,
  };
}
