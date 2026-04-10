"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useCallback, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { CopyIcon, TrashIcon } from "@/components/sidebar-03/animated-icons";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/settings/shared/settings-button";
import { Input } from "@/components/ui/input";
import { BentoCard } from "@/components/settings/shared/bento-card";
import {
  SettingsPage,
  SettingsPageHeader,
} from "@/components/settings-v2/primitives/page";
import { useAuthContext } from "@/hooks/auth/use-auth-context";
import {
  SettingsTable,
  SettingsTableBody,
  SettingsTableCell,
  SettingsTableEmptyCell,
  SettingsTableHead,
  SettingsTableHeader,
  SettingsTableHeaderRow,
  SettingsTableRow,
  SettingsTableShell,
} from "@/components/settings/shared/settings-table";

import { logger } from "@/lib/logger";
interface CacheEntry {
  key: string;
  value: UntypedJson;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CacheResponse {
  success: boolean;
  data?: CacheEntry[];
  error?: { code: string; message: string };
}

const isAdminUser = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const role = typeof user.role === "string" ? user.role.toLowerCase() : null;
  if (role === "admin") return true;
  const roles = (user.app_metadata as { roles?: UntypedJson } | null)?.roles;
  return (
    Array.isArray(roles) &&
    roles.some(
      (entry) => typeof entry === "string" && entry.toLowerCase() === "admin",
    )
  );
};

export default function CachePage() {
  // Auth is enforced server-side by app/(authenticated)/layout.tsx
  return <CacheDashboard />;
}

function CacheDashboard() {
  const { user, status, isSyncing } = useAuthContext();
  const isAdmin = useMemo(() => isAdminUser(user), [user]);
  const accessReady = status !== "loading" && !isSyncing;
  const canManageCache = accessReady && isAdmin;
  const accessDenied = accessReady && !isAdmin;

  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [manualPending, setManualPending] = useState<boolean>(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cache", { cache: "no-store" });
      if (response.status === 403) {
        setError("Admin access required to view cache entries.");
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to load cache entries (${response.status})`);
      }
      const body = (await response.json()) as CacheResponse;
      if (!body.success) {
        throw new Error(body.error?.message ?? "Unable to load cache entries");
      }
      setEntries(body.data ?? []);
    } catch (err) {
      logger.error("Failed to load cache entries", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unknown error while loading cache entries",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!accessReady) return;
    if (!canManageCache) {
      setLoading(false);
      if (accessDenied) {
        setError("Admin access required to view cache entries.");
      }
      return;
    }
    void loadEntries();
  }, [accessDenied, accessReady, canManageCache, loadEntries]);

  const invalidateKey = useCallback(
    async (key: string) => {
      try {
        setPendingKey(key);
        const response = await fetch("/api/cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const body = (await response.json()) as CacheResponse & {
          data?: { success: boolean };
        };
        if (!response.ok || !body.success) {
          throw new Error(
            body.error?.message ?? `Failed to invalidate key ${key}`,
          );
        }
        toast.success(`Cache entry invalidated`, { description: key });
        await loadEntries();
      } catch (err) {
        logger.error("Failed to invalidate cache entry", err);
        toast.error(`Failed to invalidate cache entry`, {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setPendingKey(null);
      }
    },
    [loadEntries],
  );

  const handleManualInvalidate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!manualKey.trim()) {
        toast.error("Enter a cache key to invalidate");
        return;
      }
      try {
        setManualPending(true);
        await invalidateKey(manualKey.trim());
        setManualKey("");
      } finally {
        setManualPending(false);
      }
    },
    [invalidateKey, manualKey],
  );

  const renderValuePreview = useCallback((value: UntypedJson) => {
    if (value === null || value === undefined) return "—";
    try {
      if (typeof value === "string") {
        return value.length > 80 ? `${value.slice(0, 77)}…` : value;
      }
      const serialised = JSON.stringify(value);
      return serialised.length > 80
        ? `${serialised.slice(0, 77)}…`
        : serialised;
    } catch {
      return "[unserializable]";
    }
  }, []);

  const copyKey = useCallback(async (key: string) => {
    if (!navigator?.clipboard) {
      toast.error("Clipboard unavailable", {
        description: "Your browser does not allow copying from this page.",
      });
      return;
    }
    await navigator.clipboard.writeText(key);
    toast.success("Cache key copied", { description: key });
  }, []);

  const hasEntries = entries.length > 0;

  return (
    <SettingsPage>
      <SettingsPageHeader
        title="Artifact Cache"
        description="Inspect cached artifact and tool responses and invalidate stale entries without redeploying services."
      />

      <BentoCard>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="settings-card-title">Runtime Cache Entries</h3>
              <p className="settings-card-description">
                The cache auto-expires entries after 10 minutes. Use the table
                below to inspect the current store.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadEntries()}
                disabled={loading || !canManageCache}
                className="border-[var(--bento-border)] hover:bg-white/5"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {accessDenied ? (
            <Alert variant="destructive">
              <AlertTitle>Admin access required</AlertTitle>
              <AlertDescription>
                Only workspace admins can view or invalidate artifact cache
                entries. Ask an admin to grant you the
                <span className="font-semibold"> admin </span>
                role in Supabase if you need access.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <form
                onSubmit={handleManualInvalidate}
                className="flex flex-col gap-3 md:flex-row"
              >
                <Input
                  value={manualKey}
                  onChange={(event) => setManualKey(event.target.value)}
                  placeholder="Cache key (e.g. burn-rate-chart:...)"
                  className="flex-1 text-xs"
                  disabled={!canManageCache}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={
                      manualPending || !manualKey.trim() || !canManageCache
                    }
                    className="settings-primary-button h-8 rounded-[10px] px-3 text-xs"
                  >
                    {manualPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <TrashIcon className="mr-2 h-4 w-4" />
                    )}
                    Invalidate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setManualKey("")}
                    disabled={manualPending || !manualKey || !canManageCache}
                    className="border-[var(--bento-border)] hover:bg-white/5"
                  >
                    Clear
                  </Button>
                </div>
              </form>

              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <SettingsTableShell>
                <SettingsTable>
                  <SettingsTableHeader>
                    <SettingsTableHeaderRow>
                      <SettingsTableHead>Key</SettingsTableHead>
                      <SettingsTableHead className="hidden md:table-cell">
                        Value Preview
                      </SettingsTableHead>
                      <SettingsTableHead>Updated</SettingsTableHead>
                      <SettingsTableHead>Expires</SettingsTableHead>
                      <SettingsTableHead className="text-right">
                        Actions
                      </SettingsTableHead>
                    </SettingsTableHeaderRow>
                  </SettingsTableHeader>
                  <SettingsTableBody>
                    {hasEntries ? (
                      entries.map((entry) => {
                        const isRowPending = pendingKey === entry.key;
                        const expiresLabel = entry.expiresAt
                          ? formatDistanceToNow(new Date(entry.expiresAt), {
                              addSuffix: true,
                            })
                          : "No expiry";
                        return (
                          <SettingsTableRow key={entry.key}>
                            <SettingsTableCell className="max-w-[220px] truncate font-mono text-xs text-[var(--settings-foreground-strong)]">
                              {entry.key}
                            </SettingsTableCell>
                            <SettingsTableCell className="hidden max-w-[320px] truncate text-xs md:table-cell">
                              {renderValuePreview(entry.value)}
                            </SettingsTableCell>
                            <SettingsTableCell className="text-xs">
                              {new Date(entry.updatedAt).toLocaleString()}
                            </SettingsTableCell>
                            <SettingsTableCell className="text-xs">
                              <Badge
                                variant={
                                  entry.expiresAt ? "secondary" : "outline"
                                }
                              >
                                {expiresLabel}
                              </Badge>
                            </SettingsTableCell>
                            <SettingsTableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-white/5"
                                  onClick={() => void copyKey(entry.key)}
                                >
                                  <CopyIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-white/5"
                                  onClick={() => void invalidateKey(entry.key)}
                                  disabled={isRowPending}
                                >
                                  {isRowPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </SettingsTableCell>
                          </SettingsTableRow>
                        );
                      })
                    ) : (
                      <SettingsTableRow>
                        <SettingsTableEmptyCell colSpan={5} className="h-20">
                          {loading
                            ? "Loading cache entries..."
                            : "No cached entries currently stored."}
                        </SettingsTableEmptyCell>
                      </SettingsTableRow>
                    )}
                  </SettingsTableBody>
                </SettingsTable>
              </SettingsTableShell>
            </>
          )}
        </div>
      </BentoCard>
    </SettingsPage>
  );
}
