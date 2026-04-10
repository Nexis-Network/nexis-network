"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Bell, CheckCircle2, CircleAlert, Clock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useNotifications } from "@/lib/hooks/user/use-notifications";
import type { NotificationItem } from "@/lib/notifications";

import { BentoCard, BentoCardHeader } from "../shared/bento-card";

export function NotificationsCard() {
  const router = useRouter();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const rows = notifications.slice(0, 5);

  const openNotification = async (notification: NotificationItem) => {
    const href = notification.url?.trim();
    if (!href) {
      return;
    }

    setOpeningId(notification.id);
    try {
      if (!isRead(notification)) {
        const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}/read`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? `Failed to update notification (${response.status})`);
        }

        void refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update notification");
    } finally {
      setOpeningId(null);
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(href);
  };

  return (
    <BentoCard>
      <BentoCardHeader title="Notifications" status="online" />

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-xs text-[var(--bento-text-muted)]">Loading notifications...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-[var(--bento-text-muted)]">No notifications yet.</p>
        ) : (
          rows.map((notification) => {
            const read = isRead(notification);
            const href = notification.url?.trim() || null;
            const opening = openingId === notification.id;
            return (
              <div key={notification.id} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-full bg-[var(--settings-elevated)] p-1.5">
                  {iconForNotification(notification)}
                </div>
                {href ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-[var(--settings-elevated)] disabled:cursor-not-allowed disabled:opacity-80"
                    onClick={() => {
                      void openNotification(notification);
                    }}
                    disabled={opening}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] font-medium ${read ? "text-[var(--bento-text-muted)]" : "text-[var(--bento-text-primary)]"}`}>
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-[var(--bento-text-muted)]">
                        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : formatRelative(notification.timestamp)}
                      </span>
                    </div>
                    {notification.description ? (
                      <p className="mt-0.5 truncate text-[11px] text-[var(--bento-text-muted)]">{notification.description}</p>
                    ) : null}
                  </button>
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] font-medium ${read ? "text-[var(--bento-text-muted)]" : "text-[var(--bento-text-primary)]"}`}>
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-[var(--bento-text-muted)]">{formatRelative(notification.timestamp)}</span>
                    </div>
                    {notification.description ? (
                      <p className="mt-0.5 truncate text-[11px] text-[var(--bento-text-muted)]">{notification.description}</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}

        <Link
          href="/settings/notifications"
          className="settings-surface-button inline-flex h-8 w-full items-center justify-center gap-1 rounded-[10px] px-3 text-[12px] font-medium"
        >
          View all notifications
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </BentoCard>
  );
}

function iconForNotification(notification: NotificationItem) {
  if (notification.status === "failed") {
    return <CircleAlert className="size-4 text-[#d5aaaa]" />;
  }
  if (notification.status === "completed") {
    return <CheckCircle2 className="size-4 text-[#b8c2b1]" />;
  }
  if (notification.source === "transaction") {
    return <RefreshCw className="size-4 text-[#bac4d0]" />;
  }
  if (notification.status === "in_progress" || notification.status === "planned") {
    return <Clock className="size-4 text-[#d0c09a]" />;
  }
  return <Bell className="size-4 text-[#c7c7cc]" />;
}

function isRead(notification: NotificationItem) {
  if (notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata)) {
    return notification.metadata.read === true;
  }
  return false;
}

function formatRelative(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString();
}
