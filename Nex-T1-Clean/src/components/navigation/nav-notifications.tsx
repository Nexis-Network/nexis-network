"use client";

import Image from "next/image";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NotificationItem } from "@/lib/notifications";
import { BellIcon } from "@/components/visuals/demos/skipier42";
import { cn } from "@/lib/utils";

type NotificationsPopoverProps = {
  notifications: NotificationItem[] | undefined;
  isLoading?: boolean;
  onRefresh?: () => void;
  error?: string | null;
  triggerClassName?: string;
  iconClassName?: string;
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  in_progress: "In progress",
  planned: "Planned",
  info: "Info",
};

const STATUS_CLASSES: Record<string, string> = {
  completed:
    "border border-emerald-500/20 bg-[#8eb94f]/10 text-emerald-300",
  failed:
    "border border-rose-500/20 bg-rose-500/10 text-rose-300",
  in_progress:
    "border border-sky-500/20 bg-sky-500/10 text-sky-300",
  planned:
    "border border-amber-500/20 bg-amber-500/10 text-amber-300",
  info:
    "border border-zinc-500/20 bg-zinc-500/10 text-zinc-200",
};

function NotificationIcon({ notification }: { notification: NotificationItem }) {
  const iconSize = "size-3.5"; // Reduced size for consistency

  if (notification.source === "transaction") {
    const direction = notification.metadata?.direction;
    const directionIcon =
      direction === "inbound" ? (
        <ArrowDownLeft className={cn(iconSize, "text-emerald-300")} />
      ) : direction === "outbound" ? (
        <ArrowUpRight className={cn(iconSize, "text-sky-300")} />
      ) : (
        <ArrowUpRight className={cn(iconSize, "text-zinc-200")} />
      );

    const chainIcon =
      typeof notification.metadata?.icon === "string" && notification.metadata.icon.length > 0
        ? notification.metadata.icon
        : null;

    if (chainIcon) {
      return (
        <div className="relative flex">
          <div className="relative h-7 w-7 overflow-hidden rounded-full border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] text-[var(--auth-menu-fg)]">
            <Image src={chainIcon} alt="Chain icon" fill sizes="32px" className="object-contain" />
          </div>
          <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-[var(--auth-menu-border)] bg-[var(--auth-menu-bg)]">
            {directionIcon}
          </span>
        </div>
      );
    }

    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] text-[var(--auth-menu-fg)]">
        {directionIcon}
      </div>
    );
  }

  if (notification.source === "agent") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-200">
        <Bot className={cn(iconSize)} />
      </div>
    );
  }

  if (notification.source === "watchlist") {
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">
        <Sparkles className={cn(iconSize)} />
      </div>
    );
  }

  if (notification.source === "task") {
    const isComplete = notification.status === "completed";
    const isFailed = notification.status === "failed";
    const Icon = isComplete ? CheckCircle2 : isFailed ? AlertTriangle : Clock3;
    const classes = isComplete
      ? "border-emerald-500/20 bg-[#8eb94f]/10 text-emerald-200"
      : isFailed
        ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
        : "border-amber-500/20 bg-amber-500/10 text-amber-200";
    return (
      <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", classes)}>
        <Icon className={cn(iconSize)} />
      </div>
    );
  }

  if (notification.source === "networth") {
    const trendDown = notification.status === "failed";
    const Icon = trendDown ? TrendingDown : TrendingUp;
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
        <Icon className={cn(iconSize)} />
      </div>
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-200">
      <AlertTriangle className={cn(iconSize)} />
    </div>
  );
}

function NotificationStatus({ status }: { status: NotificationItem["status"] }) {
  if (!status) {
    return null;
  }
  const label = STATUS_LABEL[status] ?? status;
  const classes = STATUS_CLASSES[status] ?? STATUS_CLASSES.info;
  return (
    <Badge variant="outline" className={cn("h-4 px-1 text-[9px] font-medium uppercase tracking-wide", classes)}>
      {label}
    </Badge>
  );
}

export function NotificationsPopover({
  notifications,
  isLoading,
  onRefresh,
  error,
  triggerClassName,
  iconClassName,
}: NotificationsPopoverProps) {
  const hasNotifications = (notifications?.length ?? 0) > 0;

  const triggerIndicator = useMemo(() => {
    if (!notifications?.length) return null;
    const unreadCount = notifications.slice(0, 5).length;
    if (unreadCount <= 0) return null;
    return (
      <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.85)]">
        <span className="sr-only">{unreadCount} unread notifications</span>
      </span>
    );
  }, [notifications]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-full text-[var(--auth-nav-text)] hover:text-[var(--auth-nav-text-active)]",
            triggerClassName,
          )}
          aria-label="Open notifications"
        >
          <BellIcon
            className={cn(
              "size-5 text-[var(--auth-nav-text)] transition-colors group-hover:text-[var(--auth-nav-text-active)]",
              iconClassName,
            )}
          />
          {triggerIndicator}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[320px] max-h-[85vh] overflow-y-auto p-0"
      >
        <div className="flex items-center justify-between p-2 pb-1.5">
          <DropdownMenuLabel className="p-0 pl-1.5 text-xs font-semibold uppercase tracking-wider opacity-80">
            Activity Center
          </DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 rounded-md text-[var(--auth-menu-muted)] hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-fg)]"
                onClick={onRefresh}
                aria-label="Refresh notifications"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        <ScrollArea className="max-h-[360px] w-full">
          <div className="flex flex-col gap-1 p-1">
            {isLoading && !hasNotifications ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`notification-skeleton-${index}`}
                  className="flex animate-pulse items-start gap-3 rounded-md px-2 py-2"
                >
                  <div className="h-7 w-7 rounded-full bg-[var(--auth-menu-subtle-bg)]" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-3 w-2/3 rounded bg-[var(--auth-menu-subtle-bg)]" />
                    <div className="h-2 w-1/2 rounded bg-[var(--auth-menu-subtle-bg)]" />
                  </div>
                </div>
              ))
            ) : hasNotifications ? (
              notifications!.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="group flex cursor-default items-start gap-2.5 rounded-md px-2 py-2"
                  onSelect={(event) => event.preventDefault()}
                >
                  <div className="mt-0.5">
                    <NotificationIcon notification={notification} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--auth-menu-hover-fg)] truncate">{notification.title}</span>
                      <NotificationStatus status={notification.status} />
                    </div>
                    {notification.description ? (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-[var(--auth-menu-muted)]">
                        {notification.description}
                      </p>
                    ) : null}
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--auth-menu-muted)]">
                      {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--auth-menu-subtle-border)] bg-[var(--auth-menu-subtle-bg)] text-[var(--auth-menu-muted)]">
                   <BellIcon className="size-5 opacity-40" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-[var(--auth-menu-hover-fg)]">No activity yet</p>
                  <p className="mx-auto max-w-[180px] text-[10px] leading-relaxed text-[var(--auth-menu-muted)]">
                    Wallet, agent actions, and system events will show up here.
                  </p>
                </div>
              </div>
            )}
            {error ? (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-200">
                {error}
              </div>
            ) : null}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-1">
           <Button
            type="button"
            variant="ghost"
            className="h-8 w-full justify-center rounded-md text-xs text-[var(--auth-menu-muted)] hover:bg-[var(--auth-menu-hover-bg)] hover:text-[var(--auth-menu-fg)]"
            onClick={onRefresh}
          >
            Refresh feed
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
