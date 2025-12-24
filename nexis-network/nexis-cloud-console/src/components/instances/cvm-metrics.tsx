"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes, formatUptime } from "@/lib/cvms";
import { updateCvmVisibility } from "@/components/instances/cvm-visibility";

type DiskInfo = {
  total_size: number;
  free_size: number;
};

type SysInfo = {
  num_cpus: number;
  total_memory: number;
  used_memory: number;
  free_memory: number;
  total_swap: number;
  uptime: number;
  loadavg_one: number;
  loadavg_five: number;
  loadavg_fifteen: number;
  disks: DiskInfo[];
  cpu_model: string;
  os_name: string;
  os_version: string;
  kernel_version: string;
};

type StatsResponse = {
  is_online: boolean;
  is_public?: boolean;
  error: string | null;
  sysinfo: SysInfo | null;
  status: string | null;
  in_progress: boolean;
  boot_progress: string | null;
  boot_error: string | null;
};

type MetricBarProps = {
  label: string;
  value: string;
  percent: number;
  helper?: string;
  sparkline?: number[];
  sparklineColor?: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const width = 120;
  const height = 32;
  const padding = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * (width - padding * 2) + padding;
      const y =
        height -
        padding -
        ((value - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetricBar({ label, value, percent, helper, sparkline, sparklineColor }: MetricBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{label}</span>
        <span className="text-text-primary">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-background-card">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-accent-sky to-accent-cyan"
          style={{ width: `${clampPercent(percent)}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {helper && <div className="text-xs text-text-muted">{helper}</div>}
        {sparkline && sparkline.length > 1 && (
          <Sparkline values={sparkline} color={sparklineColor ?? "#38BDF8"} />
        )}
      </div>
    </div>
  );
}

export type CvmMetricsProps = {
  appId: string;
  publicSysinfo: boolean;
  publicLogs: boolean;
};

export function CvmMetrics({ appId, publicSysinfo, publicLogs }: CvmMetricsProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [visibility, setVisibility] = useState({
    publicSysinfo,
    publicLogs,
  });
  const [history, setHistory] = useState<Array<{ cpu: number; memory: number; disk: number }>>(
    []
  );

  const fetchStats = useCallback(async () => {
    if (!visibility.publicSysinfo) {
      setLoading(false);
      setStats(null);
      setHistory([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cvms/${appId}/stats`, { cache: "no-store" });
      if (!response.ok) {
        let message = "Unable to load CVM stats.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) message = payload.error;
        } catch {
          // ignore
        }
        setError(message);
        setStats(null);
        return;
      }
      const payload = (await response.json()) as StatsResponse;
      setStats(payload);
      if (payload.sysinfo) {
        const sysinfo = payload.sysinfo;
        const cpuPercent =
          sysinfo.num_cpus > 0 ? (sysinfo.loadavg_one / sysinfo.num_cpus) * 100 : 0;
        const memoryPercent =
          sysinfo.total_memory > 0 ? (sysinfo.used_memory / sysinfo.total_memory) * 100 : 0;
        const diskTotals = sysinfo.disks.reduce(
          (acc, disk) => {
            acc.total += disk.total_size;
            acc.used += Math.max(0, disk.total_size - disk.free_size);
            return acc;
          },
          { total: 0, used: 0 }
        );
        const diskPercent = diskTotals.total > 0 ? (diskTotals.used / diskTotals.total) * 100 : 0;
        setHistory((prev) => [
          ...prev.slice(-29),
          {
            cpu: clampPercent(cpuPercent),
            memory: clampPercent(memoryPercent),
            disk: clampPercent(diskPercent),
          },
        ]);
      }
    } catch {
      setError("Unable to reach the stats endpoint.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [appId, visibility.publicSysinfo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh || !visibility.publicSysinfo) return;
    const interval = window.setInterval(fetchStats, 15000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchStats, visibility.publicSysinfo]);

  const metrics = useMemo(() => {
    if (!stats?.sysinfo) return null;
    const sysinfo = stats.sysinfo;
    const cpuPercent =
      sysinfo.num_cpus > 0 ? (sysinfo.loadavg_one / sysinfo.num_cpus) * 100 : 0;
    const memoryPercent =
      sysinfo.total_memory > 0 ? (sysinfo.used_memory / sysinfo.total_memory) * 100 : 0;
    const diskTotals = sysinfo.disks.reduce(
      (acc, disk) => {
        acc.total += disk.total_size;
        acc.used += Math.max(0, disk.total_size - disk.free_size);
        return acc;
      },
      { total: 0, used: 0 }
    );
    const diskPercent = diskTotals.total > 0 ? (diskTotals.used / diskTotals.total) * 100 : 0;

    return {
      cpuPercent,
      cpuValue: `${sysinfo.loadavg_one.toFixed(2)} load`,
      cpuHelper: `1m/5m/15m: ${sysinfo.loadavg_one.toFixed(2)} · ${sysinfo.loadavg_five.toFixed(2)} · ${sysinfo.loadavg_fifteen.toFixed(2)}`,
      memoryPercent,
      memoryValue: `${formatBytes(sysinfo.used_memory)} / ${formatBytes(sysinfo.total_memory)}`,
      memoryHelper: `Free ${formatBytes(sysinfo.free_memory)} · Swap ${formatBytes(sysinfo.total_swap)}`,
      diskPercent,
      diskValue: `${formatBytes(diskTotals.used)} / ${formatBytes(diskTotals.total)}`,
      diskHelper: `${sysinfo.disks.length} mount(s)`,
      uptime: formatUptime(sysinfo.uptime),
      cpuModel: sysinfo.cpu_model,
      os: `${sysinfo.os_name} ${sysinfo.os_version}`,
      kernel: sysinfo.kernel_version,
    };
  }, [stats]);

  const enableSysinfo = async () => {
    try {
      await updateCvmVisibility(appId, true, visibility.publicLogs);
      setVisibility((prev) => ({ ...prev, publicSysinfo: true }));
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to enable system info.");
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Metrics</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
          >
            {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={fetchStats}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!visibility.publicSysinfo && (
          <div className="rounded-md border border-border-default bg-background-surface/60 p-4 text-sm text-text-secondary">
            <div className="mb-3 text-text-primary">System metrics are private for this CVM.</div>
            <Button type="button" size="sm" onClick={enableSysinfo}>
              Enable metrics visibility
            </Button>
          </div>
        )}

        {loading && <div className="text-sm text-text-secondary">Loading metrics...</div>}

        {error && <div className="text-sm text-red-400">{error}</div>}

        {!loading && !error && metrics ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <MetricBar
                label="CPU load"
                value={metrics.cpuValue}
                percent={metrics.cpuPercent}
                helper={metrics.cpuHelper}
                sparkline={history.map((point) => point.cpu)}
                sparklineColor="#38BDF8"
              />
              <MetricBar
                label="Memory usage"
                value={metrics.memoryValue}
                percent={metrics.memoryPercent}
                helper={metrics.memoryHelper}
                sparkline={history.map((point) => point.memory)}
                sparklineColor="#22D3EE"
              />
              <MetricBar
                label="Disk usage"
                value={metrics.diskValue}
                percent={metrics.diskPercent}
                helper={metrics.diskHelper}
                sparkline={history.map((point) => point.disk)}
                sparklineColor="#818CF8"
              />
              <div className="space-y-2">
                <div className="text-xs text-text-secondary">Uptime</div>
                <div className="text-sm text-text-primary">{metrics.uptime}</div>
                <div className="text-xs text-text-muted">{metrics.cpuModel}</div>
                <div className="text-xs text-text-muted">{metrics.os}</div>
                <div className="text-xs text-text-muted">Kernel {metrics.kernel}</div>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
