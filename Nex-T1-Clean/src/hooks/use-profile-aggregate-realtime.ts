"use client";

import { useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  deferRealtimeSubscriptionStart,
  retainSharedRealtimeSubscription,
} from "@/lib/supabase/shared-realtime";
import { useWalletRealtimeSubscription } from "@/hooks/wallets/use-wallet-realtime-subscription";

type UseProfileAggregateRealtimeOptions = {
  enabled: boolean;
  onNotify: () => void;
  userId: string | null | undefined;
};

export function useProfileAggregateRealtime({
  enabled,
  onNotify,
  userId,
}: UseProfileAggregateRealtimeOptions) {
  const profileRealtimeKey = useMemo(
    () => (userId ? `profile-aggregate:${userId}` : null),
    [userId],
  );

  useEffect(() => {
    if (!enabled || !profileRealtimeKey || !userId) {
      return;
    }

    return retainSharedRealtimeSubscription(
      profileRealtimeKey,
      onNotify,
      (notify) => {
        const supabase = createClient();
        let channel: ReturnType<typeof supabase.channel> | null = null;
        const cancelDeferredStart = deferRealtimeSubscriptionStart(() => {
          channel = supabase
            .channel(`profile:${userId}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "profiles",
                filter: `id=eq.${userId}`,
              },
              notify,
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "user_profiles",
                filter: `user_id=eq.${userId}`,
              },
              notify,
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "user_artifacts",
                filter: `user_id=eq.${userId}`,
              },
              notify,
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "user_ens_subnames",
                filter: `user_id=eq.${userId}`,
              },
              notify,
            )
            .subscribe();
        });

        return () => {
          cancelDeferredStart();
          if (channel) {
            channel.unsubscribe();
            void supabase.removeChannel(channel);
          }
        };
      },
    );
  }, [enabled, onNotify, profileRealtimeKey, userId]);

  useWalletRealtimeSubscription({ enabled, onNotify, userId });
}
