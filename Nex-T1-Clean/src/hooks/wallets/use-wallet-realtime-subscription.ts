"use client";

import { useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  deferRealtimeSubscriptionStart,
  retainSharedRealtimeSubscription,
} from "@/lib/supabase/shared-realtime";
import {
  getWalletRealtimeChannelName,
  getWalletRealtimeSharedKey,
  getWalletRealtimeTargets,
} from "@/lib/supabase/wallet-realtime";

type UseWalletRealtimeSubscriptionOptions = {
  enabled: boolean;
  onNotify: () => void;
  userId: string | null | undefined;
};

export function useWalletRealtimeSubscription({
  enabled,
  onNotify,
  userId,
}: UseWalletRealtimeSubscriptionOptions) {
  const sharedKey = useMemo(
    () => (userId ? getWalletRealtimeSharedKey(userId) : null),
    [userId],
  );

  useEffect(() => {
    if (!enabled || !sharedKey || !userId) {
      return;
    }

    return retainSharedRealtimeSubscription(sharedKey, onNotify, (notify) => {
      const supabase = createClient();
      let channel: ReturnType<typeof supabase.channel> | null = null;
      const cancelDeferredStart = deferRealtimeSubscriptionStart(() => {
        channel = supabase.channel(getWalletRealtimeChannelName(userId));

        for (const target of getWalletRealtimeTargets(userId)) {
          channel = channel.on("postgres_changes", target, notify);
        }

        channel.subscribe();
      });

      return () => {
        cancelDeferredStart();
        if (channel) {
          channel.unsubscribe();
          void supabase.removeChannel(channel);
        }
      };
    });
  }, [enabled, onNotify, sharedKey, userId]);
}
