"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import {
  deferRealtimeSubscriptionStart,
  retainSharedRealtimeSubscription,
} from "@/lib/supabase/shared-realtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CdpNotificationItem = {
  id: string;
  source: string;
  title: string;
  message: string | null;
  timestamp: string;
  status: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  type: string | null;
};

type CdpNotificationsApiResponse = {
  success: boolean;
  data?: {
    notifications: CdpNotificationItem[];
    generatedAt: string;
    error?: string;
  };
  meta?: {
    hasMore?: boolean;
    nextCursor?: string | null;
    limit?: number;
  };
};

type CdpNotificationCountResponse = {
  success: boolean;
  data?: {
    unread: number;
    error?: string;
  };
};

type CdpMarkReadResponse = {
  success: boolean;
  data?: {
    id: string;
    read: boolean;
  };
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const CDP_NOTIFICATIONS_KEY = "cdp-notifications";
const CDP_NOTIFICATIONS_COUNT_KEY = "cdp-notifications-count";

// ---------------------------------------------------------------------------
// Helper: fetch with auth
// ---------------------------------------------------------------------------

async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  return fetch(url, {
    cache: "no-store",
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// useCdpNotifications
// ---------------------------------------------------------------------------

export function useCdpNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}) {
  const { status, user } = useAuthContext();
  const queryClient = useQueryClient();
  const isAuthenticated = status === "authenticated" && Boolean(user);
  const limit = options?.limit ?? 30;
  const unreadOnly = options?.unreadOnly ?? false;

  const queryKey = useMemo(
    () => [
      CDP_NOTIFICATIONS_KEY,
      isAuthenticated ? user?.id ?? "unknown" : "guest",
      { limit, unreadOnly },
    ],
    [isAuthenticated, user?.id, limit, unreadOnly],
  );
  const realtimeKey = useMemo(
    () => (user?.id ? `${CDP_NOTIFICATIONS_KEY}:${user.id}` : null),
    [user?.id],
  );
  const invalidateNotifications = useCallback(() => {
    if (!user?.id) return;
    void queryClient.invalidateQueries({
      queryKey: [CDP_NOTIFICATIONS_KEY, user.id],
    });
    void queryClient.invalidateQueries({
      queryKey: [CDP_NOTIFICATIONS_COUNT_KEY, user.id],
    });
  }, [queryClient, user?.id]);

  // Subscribe to realtime inserts on the notifications table for this user
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !realtimeKey) return;

    return retainSharedRealtimeSubscription(
      realtimeKey,
      invalidateNotifications,
      (notify) => {
        const supabase = createClient();
        let channel: ReturnType<typeof supabase.channel> | null = null;
        const cancelDeferredStart = deferRealtimeSubscriptionStart(() => {
          channel = supabase
            .channel(`cdp-notifications:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${user.id}`,
              },
              notify,
            )
            .subscribe();
        });

        return () => {
          cancelDeferredStart();
          if (channel) {
            void supabase.removeChannel(channel);
          }
        };
      },
    );
  }, [invalidateNotifications, isAuthenticated, realtimeKey, user?.id]);

  return useQuery<CdpNotificationItem[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (unreadOnly) params.set("unreadOnly", "true");

      const res = await fetchWithAuth(`/api/cdp/notifications?${params.toString()}`);

      if (res.status === 401) return [];
      if (!res.ok) {
        const errorText = await res.text().catch(() => "Failed to load CDP notifications");
        throw new Error(errorText || "Failed to load CDP notifications");
      }

      const payload: CdpNotificationsApiResponse = await res
        .json()
        .catch(() => ({ success: false }));

      if (!payload.success || !Array.isArray(payload.data?.notifications)) {
        return [];
      }

      return payload.data.notifications;
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
    initialData: [],
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// useUnreadNotificationCount
// ---------------------------------------------------------------------------

export function useUnreadNotificationCount() {
  const { status, user } = useAuthContext();
  const isAuthenticated = status === "authenticated" && Boolean(user);

  const queryKey = useMemo(
    () => [CDP_NOTIFICATIONS_COUNT_KEY, isAuthenticated ? user?.id ?? "unknown" : "guest"],
    [isAuthenticated, user?.id],
  );

  return useQuery<number>({
    queryKey,
    queryFn: async () => {
      const res = await fetchWithAuth("/api/cdp/notifications/count");

      if (res.status === 401) return 0;
      if (!res.ok) return 0;

      const payload: CdpNotificationCountResponse = await res
        .json()
        .catch(() => ({ success: false }));

      if (!payload.success) return 0;
      return payload.data?.unread ?? 0;
    },
    refetchInterval: 60_000, // poll every 60 seconds as fallback
    refetchOnWindowFocus: true,
    enabled: isAuthenticated,
    initialData: 0,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// useMarkNotificationRead
// ---------------------------------------------------------------------------

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    { id: string; read: boolean },
    Error,
    string
  >({
    mutationFn: async (notificationId: string) => {
      const res = await fetchWithAuth(
        `/api/cdp/notifications/${encodeURIComponent(notificationId)}/read`,
        { method: "POST" },
      );

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Failed to mark notification as read");
        throw new Error(errorText);
      }

      const payload: CdpMarkReadResponse = await res.json().catch(() => ({ success: false }));
      if (!payload.success || !payload.data) {
        throw new Error("Failed to mark notification as read");
      }

      return payload.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CDP_NOTIFICATIONS_KEY] });
      void queryClient.invalidateQueries({ queryKey: [CDP_NOTIFICATIONS_COUNT_KEY] });
    },
  });

  const markRead = useCallback(
    (notificationId: string) => mutation.mutate(notificationId),
    [mutation],
  );

  return {
    markRead,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
