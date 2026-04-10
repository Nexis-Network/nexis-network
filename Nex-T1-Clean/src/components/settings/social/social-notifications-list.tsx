"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bell, CheckCheck, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { SettingsSection } from "@/components/settings-v2/primitives/page";
import { Button } from "@/components/settings/shared/settings-button";
import { useInfiniteNotifications } from "@/lib/hooks/user/use-notifications";
import type { NotificationItem } from "@/lib/notifications";

export function SocialNotificationsList() {
  const router = useRouter();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const {
    notifications,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteNotifications(30);
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `Failed to update notification (${response.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: UntypedJson) => {
      toast.error(error instanceof Error ? error.message : "Unable to update notification");
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `Failed to update notifications (${response.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: UntypedJson) => {
      toast.error(error instanceof Error ? error.message : "Unable to update notifications");
    },
  });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !isNotificationRead(item)).length,
    [notifications],
  );

  const openNotification = async (notification: NotificationItem) => {
    const href = notification.url?.trim();
    if (!href) {
      return;
    }

    const openInNewTab = href.startsWith("http://") || href.startsWith("https://");
    setOpeningId(notification.id);

    try {
      if (!isNotificationRead(notification)) {
        await markRead.mutateAsync(notification.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update notification");
    } finally {
      setOpeningId(null);
    }

    if (openInNewTab) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(href);
  };

  return (
    <SettingsSection
      tone="ledger"
      title="Notifications"
      description="Alerts for follows, comments, likes, shares, and platform events."
      badge={
        <span className="rounded-full border border-[var(--settings-border-soft)] px-2 py-0.5 text-[11px] text-[var(--settings-foreground-muted)]">
          {unreadCount} unread
        </span>
      }
      action={
        unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-[var(--settings-border)]/8 bg-[var(--settings-surface)] px-3"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </Button>
        ) : null
      }
    >
      <div>
        {isLoading ? (
          <div className="px-5 py-10 text-center text-xs text-[var(--settings-foreground-muted)]">
            <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-[var(--settings-foreground-muted)]">
            <Bell className="mx-auto mb-2 h-4 w-4" />
            No notifications yet.
          </div>
        ) : (
          <div data-settings-row-list>
            {notifications.map((notification) => {
              const isRead = isNotificationRead(notification);
              const href = notification.url?.trim() ? notification.url.trim() : null;
              const opening = openingId === notification.id;
              return (
                <div
                  key={notification.id}
                  className={`px-5 py-4 ${
                    isRead ? "bg-transparent" : "bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-[var(--settings-foreground-strong)]">
                        {notification.title}
                      </p>
                      {notification.description ? (
                        <p className="text-xs leading-5 text-[var(--settings-foreground-muted)]">
                          {notification.description}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-[var(--settings-foreground-subtle)]">
                        {formatRelative(notification.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {href ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-[var(--settings-foreground-muted)] hover:bg-white/[0.04] hover:text-[var(--settings-foreground-strong)]"
                          onClick={() => {
                            void openNotification(notification);
                          }}
                          disabled={opening}
                        >
                          {opening ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          Open
                        </Button>
                      ) : null}
                      {!isRead ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 border-[var(--settings-border)]/8 bg-[var(--settings-surface)] px-2"
                          onClick={() => markRead.mutate(notification.id)}
                          disabled={markRead.isPending}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {hasNextPage ? (
        <div className="border-t border-[var(--settings-border)]/8 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-[var(--settings-border)]/8 bg-[var(--settings-surface)]"
            onClick={() => {
              void fetchNextPage();
            }}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more
              </span>
            ) : (
              "Load more notifications"
            )}
          </Button>
        </div>
      ) : null}
    </SettingsSection>
  );
}

function isNotificationRead(item: NotificationItem) {
  if (item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)) {
    return item.metadata.read === true;
  }
  return false;
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
