"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, RotateCcw, Trash2 } from "lucide-react";

import { SettingsPanel } from "@/components/settings-v2/primitives/panel";
import { Button } from "@/components/settings/shared/settings-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/lib/hooks/auth/use-auth-context";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  issued_at: string;
  last_seen: string | null;
  ip: string | null;
  user_agent: string | null;
  revoked: boolean;
  revoked_at: string | null;
};

export function SessionListCard() {
  const { status } = useAuthContext();
  const isAuthenticated = status === "authenticated";
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setSessions([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/sessions", { credentials: "include" });

      if (res.status === 401) {
        setSessions([]);
        setError(null);
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load sessions");
      }

      const payload = json?.data ?? json;
      setSessions(Array.isArray(payload.sessions) ? payload.sessions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    void load();
  }, [load, status]);

  async function revoke(id: string) {
    setRevoking(id);

    try {
      const res = await fetch("/api/auth/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: id }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to revoke session");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <SettingsPanel
      title="Active sessions"
      description="Review recent logins and revoke any unrecognized devices."
      action={
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--settings-foreground-muted)]">
            {sessions.length} total
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full bg-white/5" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-[var(--settings-border)] px-3 py-3 text-sm text-[var(--settings-foreground-muted)]">
          No sessions found.
        </div>
      ) : (
        <div data-settings-row-list>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between",
                session.revoked && "opacity-60",
              )}
            >
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-[var(--settings-foreground-strong)]">
                  {session.user_agent ?? "Unknown device"}
                </p>
                <p className="text-sm text-[var(--settings-foreground-muted)]">
                  {session.ip ?? "Unknown IP"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--settings-foreground-muted)]">
                  <span>Issued {formatDateTime(session.issued_at)}</span>
                  <span>Last seen {formatDateTime(session.last_seen)}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={session.revoked || revoking === session.id}
                onClick={() => void revoke(session.id)}
              >
                {revoking === session.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </SettingsPanel>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "---";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "---";
  }

  return date.toLocaleString();
}
