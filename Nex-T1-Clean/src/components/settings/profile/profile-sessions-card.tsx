"use client";

import { Globe2, Monitor } from "lucide-react";

import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionSummary } from "@/lib/user/profile";

type ProfileSessionsCardProps = {
  sessions?: SessionSummary[];
  isLoading: boolean;
};

export function ProfileSessionsCard({
  sessions,
  isLoading,
}: ProfileSessionsCardProps) {
  if (isLoading) {
    return (
      <SettingsPanel
        title="Recent sessions"
        description="Recent sign-in activity across devices."
      >
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full bg-white/5" />
          ))}
        </div>
      </SettingsPanel>
    );
  }

  const list = (sessions ?? []).slice(0, 5);

  return (
    <SettingsPanel
      title="Recent sessions"
      description="Quick view of sign-in activity from the last 30 days."
      action={
        <span className="text-sm text-[var(--settings-foreground-muted)]">
          {list.length} active
        </span>
      }
    >
      {list.length === 0 ? (
        <div className="rounded-lg border border-[var(--settings-border)] px-3 py-3 text-sm text-[var(--settings-foreground-muted)]">
          No recent sessions to display.
        </div>
      ) : (
        <div data-settings-row-list>
          {list.map((session) => (
            <div
              key={session.sessionId}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-[var(--settings-foreground-muted)]" />
                  <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                    {session.device ?? "Unknown device"}
                  </p>
                </div>
                <p className="text-sm text-[var(--settings-foreground-muted)]">
                  {session.lastSeenAt
                    ? `Last active ${formatRelative(session.lastSeenAt)}`
                    : "Currently active"}
                </p>
              </div>

              <div className="space-y-1 text-sm text-[var(--settings-foreground-muted)] sm:text-right">
                <div className="flex items-center gap-2 sm:justify-end">
                  <Globe2 className="h-4 w-4" />
                  <span>{truncate(session.ipAddress ?? "\u2014", 18)}</span>
                </div>
                <p>{formatDate(session.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsPanel>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "\u2014";
  }

  const diff = Date.now() - date.getTime();
  const absolute = Math.abs(diff);
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (absolute < hour) {
    const minutes = Math.max(1, Math.round(absolute / (60 * 1000)));
    return `${minutes}m ago`;
  }

  if (absolute < day) {
    const hours = Math.max(1, Math.round(absolute / hour));
    return `${hours}h ago`;
  }

  const days = Math.max(1, Math.round(absolute / day));
  return `${days}d ago`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "\u2014";
  }

  return date.toLocaleDateString();
}

function truncate(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 3)}...`;
}
