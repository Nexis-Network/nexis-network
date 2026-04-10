"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  deferRealtimeSubscriptionStart,
  retainSharedRealtimeSubscription,
} from "@/lib/supabase/shared-realtime";

import type { NotificationItem } from "@/lib/notifications";
import { useAuthContext } from "@/hooks/auth/use-auth-context";

type ApiResponse = {
  notifications?: NotificationItem[];
  data?: {
    notifications?: NotificationItem[];
    page?: {
      offset?: number;
      limit?: number;
      hasMore?: boolean;
      nextOffset?: number | null;
    };
  };
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
};

type NotificationsPage = {
  notifications: NotificationItem[];
  page: {
    offset: number;
    limit: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
};

async function getAccessToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function parseNotifications(payload: ApiResponse): NotificationItem[] {
  if (Array.isArray(payload.notifications)) {
    return payload.notifications;
  }
  if (Array.isArray(payload.data?.notifications)) {
    return payload.data.notifications;
  }
  return [];
}

function parseNotificationsPage(payload: ApiResponse, fallbackOffset: number, fallbackLimit: number): NotificationsPage {
  const notifications = parseNotifications(payload);
  const page = payload.data?.page;

  return {
    notifications,
    page: {
      offset:
        typeof page?.offset === "number" && Number.isFinite(page.offset)
          ? Math.max(0, Math.trunc(page.offset))
          : fallbackOffset,
      limit:
        typeof page?.limit === "number" && Number.isFinite(page.limit)
          ? Math.max(1, Math.trunc(page.limit))
          : fallbackLimit,
      hasMore: page?.hasMore === true,
      nextOffset:
        typeof page?.nextOffset === "number" && Number.isFinite(page.nextOffset)
          ? Math.max(0, Math.trunc(page.nextOffset))
          : null,
    },
  };
}

export function useNotifications() {
  const { status, user } = useAuthContext();
  const queryClient = useQueryClient();
  const isAuthenticated = status === "authenticated" && Boolean(user);

  const notificationsKey = useMemo(
    () => ["notifications", isAuthenticated ? user?.id ?? "unknown" : "guest"],
    [isAuthenticated, user?.id],
  );
  const notificationsRealtimeKey = useMemo(
    () => (user?.id ? `notifications:${user.id}` : null),
    [user?.id],
  );
  const invalidateNotifications = useCallback(() => {
    if (!user?.id) return;
    void queryClient.invalidateQueries({
      queryKey: ["notifications", user.id],
    });
  }, [queryClient, user?.id]);

  // Realtime subscription to handle updates without polling
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !notificationsRealtimeKey) return;

    return retainSharedRealtimeSubscription(
      notificationsRealtimeKey,
      invalidateNotifications,
      (notify) => {
        const supabase = createClient();
        let channel: ReturnType<typeof supabase.channel> | null = null;
        const cancelDeferredStart = deferRealtimeSubscriptionStart(() => {
          channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
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
  }, [invalidateNotifications, isAuthenticated, notificationsRealtimeKey, user?.id]);

  return useQuery<NotificationItem[]>({
    queryKey: notificationsKey,
    queryFn: async () => {
      const accessToken = await getAccessToken();

      // Bail out early if no valid session — avoids a 401 network error in the console
      if (!accessToken) {
        return [];
      }

      const res = await fetch("/api/notifications", {
        cache: "no-store",
        credentials: "include",
        headers: { 
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      if (res.status === 401) {
        return [];
      }
      if (!res.ok) {
        const errorText = await res.text().catch(() => "Failed to load notifications");
        throw new Error(errorText || "Failed to load notifications");
      }
      const payload: ApiResponse = await res.json().catch(() => ({ notifications: [] }));
      if (payload.success === false) {
        throw new Error(payload.error?.message ?? "Failed to load notifications");
      }
      return parseNotifications(payload);
    },
    // Disable polling
    refetchInterval: false,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
    initialData: [],
    retry: false,
  });
}

export function useInfiniteNotifications(limit = 30) {
  const { status, user } = useAuthContext();
  const isAuthenticated = status === "authenticated" && Boolean(user);

  const notificationsKey = useMemo(
    () => ["notifications", "infinite", isAuthenticated ? user?.id ?? "unknown" : "guest", limit],
    [isAuthenticated, user?.id, limit],
  );

  const query = useInfiniteQuery<NotificationsPage>({
    queryKey: notificationsKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === "number" && Number.isFinite(pageParam) ? Math.max(0, pageParam) : 0;
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return {
          notifications: [],
          page: { offset, limit, hasMore: false, nextOffset: null },
        };
      }

      const res = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 401) {
        return {
          notifications: [],
          page: { offset, limit, hasMore: false, nextOffset: null },
        };
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "Failed to load notifications");
        throw new Error(errorText || "Failed to load notifications");
      }

      const payload: ApiResponse = await res.json().catch(() => ({ notifications: [] }));
      if (payload.success === false) {
        throw new Error(payload.error?.message ?? "Failed to load notifications");
      }

      return parseNotificationsPage(payload, offset, limit);
    },
    getNextPageParam: (lastPage) => (lastPage.page.hasMore ? lastPage.page.nextOffset ?? undefined : undefined),
    enabled: isAuthenticated,
    staleTime: 10_000,
    retry: false,
  });

  const notifications = useMemo(
    () => query.data?.pages.flatMap((page) => page.notifications) ?? [],
    [query.data?.pages],
  );

  return {
    ...query,
    notifications,
  };
}
