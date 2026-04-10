"use client";

import { useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useCdpNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  type CdpNotificationItem,
} from "@/lib/hooks/cdp/use-cdp-notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

function getNotificationIcon(notification: CdpNotificationItem) {
  const eventType = notification.type ?? "";

  if (eventType.includes("confirmed") || eventType.includes("success")) {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  }
  if (eventType.includes("failed")) {
    return <XCircle className="h-4 w-4 shrink-0 text-red-400" />;
  }
  if (eventType.includes("onramp")) {
    return <ArrowDownLeft className="h-4 w-4 shrink-0 text-blue-400" />;
  }
  if (eventType.includes("wallet")) {
    return <Wallet className="h-4 w-4 shrink-0 text-violet-400" />;
  }
  if (eventType.includes("transaction")) {
    return <ArrowUpRight className="h-4 w-4 shrink-0 text-blue-400" />;
  }

  return <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

// ---------------------------------------------------------------------------
// NotificationItem row
// ---------------------------------------------------------------------------

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: CdpNotificationItem;
  onMarkRead: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.read) {
          onMarkRead(notification.id);
        }
      }}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/[0.02]",
        !notification.read && "bg-white/[0.03]",
      )}
    >
      <div className="mt-0.5">{getNotificationIcon(notification)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              notification.read ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {notification.title}
          </span>
          {!notification.read && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          )}
        </div>
        {notification.message && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {notification.message}
          </p>
        )}
        <span className="mt-1 block text-[10px] text-muted-foreground">
          {formatRelativeTime(notification.timestamp)}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Bell className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No notifications yet</p>
      <p className="text-xs text-muted-foreground/60">
        Transaction updates will appear here
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CdpNotificationBell (main export)
// ---------------------------------------------------------------------------

export function CdpNotificationBell() {
  const { data: notifications, isLoading } = useCdpNotifications({ limit: 20 });
  const { data: unreadCount } = useUnreadNotificationCount();
  const { markRead } = useMarkNotificationRead();

  const displayCount = useMemo(() => {
    const count = unreadCount ?? 0;
    if (count > 99) return "99+";
    if (count > 0) return String(count);
    return null;
  }, [unreadCount]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Nex Wallet notifications${displayCount ? ` (${displayCount} unread)` : ""}`}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-transparent transition-colors hover:bg-white/[0.04] dark:border-white/10"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {displayCount && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white">
              {displayCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--auth-menu-separator)] px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {(unreadCount ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`skeleton-${String(i)}`}
                  className="flex items-start gap-3 p-2"
                >
                  <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-2.5 w-full animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markRead}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CdpNotificationBell;
