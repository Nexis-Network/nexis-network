"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/csrf";

type ApiKeyRecord = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: string | null;
};

type UsageSummary = {
  requestCount: number | null;
  errorCount: number | null;
  tokensUsed: number | null;
  periodLabel: string | null;
};

type UsageResponse = {
  summary: UsageSummary | null;
  error: string | null;
};

function extractItems(payload: unknown): ApiKeyRecord[] {
  if (Array.isArray(payload)) return payload as ApiKeyRecord[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const candidates = [obj.items, obj.data, obj.keys, obj.tokens, obj.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as ApiKeyRecord[];
  }
  return [];
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/keys", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to load API keys.");
      }
      const payload = (await response.json()) as unknown;
      setKeys(extractItems(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to load usage data.");
      }
      const payload = (await response.json()) as UsageResponse;
      setUsage(payload.summary);
      setUsageError(payload.error);
    } catch (err) {
      setUsage(null);
      setUsageError(err instanceof Error ? err.message : "Unable to load usage data.");
    }
  }, []);

  useEffect(() => {
    loadKeys();
    loadUsage();
  }, [loadKeys, loadUsage]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    setSecret(null);
    setSecretCopied(false);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ label: label.trim() || "Nexis CLI key" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to create API key.");
      }
      if (payload?.secret) {
        setSecret(payload.secret as string);
      }
      await loadKeys();
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create API key.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch("/api/keys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to revoke API key.");
      }
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke API key.");
    }
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
    } catch {
      setSecretCopied(false);
    }
  };

  const activeKeys = useMemo(() => keys.filter((key) => !key.revokedAt), [keys]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">API Access</h1>
        <p className="text-text-secondary mt-1">
          Generate API keys for CLI access and monitor usage across your workspace.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 space-y-2">
                <label className="text-xs text-text-muted">Key label</label>
                <Input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="CLI key for automation"
                />
              </div>
              <Button type="button" onClick={handleCreate} isLoading={creating}>
                Create key
              </Button>
            </div>

            {secret && (
              <div className="rounded-md border border-border-default bg-background-surface p-4 text-sm text-text-secondary space-y-2">
                <div className="text-text-primary font-medium">Your new API key</div>
                <div className="font-mono text-xs break-all">{secret}</div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={handleCopySecret}>
                    {secretCopied ? "Copied" : "Copy key"}
                  </Button>
                  <span className="text-xs text-text-muted">
                    Store this key now. You won’t be able to view it again.
                  </span>
                </div>
              </div>
            )}

            {error && <div className="text-sm text-red-400">{error}</div>}

            {loading ? (
              <div className="text-sm text-text-secondary">Loading keys...</div>
            ) : keys.length === 0 ? (
              <div className="text-sm text-text-secondary">No API keys created yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-text-muted">
                    <tr className="border-b border-border-default">
                      <th className="py-2 pr-4">Label</th>
                      <th className="py-2 pr-4">Prefix</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Last Used</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id} className="border-b border-border-default/60">
                        <td className="py-2 pr-4 text-text-primary">{key.label}</td>
                        <td className="py-2 pr-4 text-text-secondary font-mono">{key.prefix}</td>
                        <td className="py-2 pr-4 text-text-secondary">{formatDate(key.createdAt)}</td>
                        <td className="py-2 pr-4 text-text-secondary">
                          {formatDate(key.lastUsedAt)}
                        </td>
                        <td className="py-2 pr-4 text-text-secondary">
                          {key.revokedAt ? "Revoked" : "Active"}
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={Boolean(key.revokedAt)}
                            onClick={() => handleRevoke(key.id)}
                          >
                            Revoke
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-xs text-text-muted">
              {activeKeys.length} active key{activeKeys.length === 1 ? "" : "s"}.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-secondary">
            {usageError && <div className="text-xs text-text-muted">{usageError}</div>}
            {usage ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Requests</span>
                  <span className="text-text-primary font-medium">
                    {usage.requestCount ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Errors</span>
                  <span className="text-text-primary font-medium">
                    {usage.errorCount ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tokens</span>
                  <span className="text-text-primary font-medium">
                    {usage.tokensUsed ?? "—"}
                  </span>
                </div>
                <div className="text-xs text-text-muted">
                  {usage.periodLabel ? `Period: ${usage.periodLabel}` : "Usage period not provided."}
                </div>
              </div>
            ) : (
              <div className="text-sm text-text-secondary">Usage data unavailable.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
