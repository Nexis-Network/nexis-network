"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateCvmVisibility } from "@/components/instances/cvm-visibility";

export type CvmLogsProps = {
  appId: string;
  publicLogs: boolean;
  publicSysinfo: boolean;
};

function normalizeLogs(data: unknown) {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join("\n");
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.logs === "string") return obj.logs;
    if (Array.isArray(obj.logs)) return obj.logs.join("\n");
    if (typeof obj.data === "string") return obj.data;
    return JSON.stringify(obj, null, 2);
  }
  return "";
}

function tailLines(text: string, maxLines: number) {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(-maxLines).join("\n");
}

export function CvmLogs({ appId, publicLogs, publicSysinfo }: CvmLogsProps) {
  const [logs, setLogs] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [visibility, setVisibility] = useState({
    publicLogs,
    publicSysinfo,
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!visibility.publicLogs) {
      setLoading(false);
      setLogs("");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cvms/${appId}/logs`, { cache: "no-store" });
      if (!response.ok) {
        let message = "Unable to load logs.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) message = payload.error;
        } catch {
          // ignore json parse errors
        }
        setError(message);
        setLogs("");
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      const normalized = normalizeLogs(data);
      setLogs(tailLines(normalized, 300));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Unable to reach the logs endpoint.");
      setLogs("");
    } finally {
      setLoading(false);
    }
  }, [appId, visibility.publicLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh || !visibility.publicLogs) return;
    const interval = window.setInterval(fetchLogs, 7000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchLogs, visibility.publicLogs]);

  const enableLogs = async () => {
    try {
      await updateCvmVisibility(appId, visibility.publicSysinfo, true);
      setVisibility((prev) => ({ ...prev, publicLogs: true }));
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enable logs.");
    }
  };

  const statusText = useMemo(() => {
    if (!visibility.publicLogs) return null;
    if (loading) return "Loading logs...";
    if (error) return error;
    if (!logs) return "No logs returned yet.";
    return null;
  }, [loading, error, logs, visibility.publicLogs]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Console & Logs</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
          >
            {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={fetchLogs}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-text-secondary">
        {!visibility.publicLogs && (
          <div className="rounded-md border border-border-default bg-background-surface/60 p-4 text-sm text-text-secondary">
            <div className="mb-3 text-text-primary">Logs are private for this CVM.</div>
            <Button type="button" size="sm" onClick={enableLogs}>
              Enable log visibility
            </Button>
          </div>
        )}

        {lastUpdated && (
          <div className="text-xs text-text-muted">Last updated at {lastUpdated}</div>
        )}

        {statusText ? (
          <div className={error ? "text-red-400" : "text-text-secondary"}>{statusText}</div>
        ) : (
          <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-border-default bg-background-surface p-3 text-xs text-text-primary">
            {logs}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
