import { CHAIN_NAME_BY_ID } from "@/components/ai-leaderboard/ai-leaderboard.constants";
import type { CurvePoint, IntervalOption } from "@/types/ai-leaderboard";

const usdFormatter0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdFormatter2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dayMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "2-digit",
});

export function formatCurrency(value: number) {
  const formatter = Math.abs(value) >= 1000 ? usdFormatter0 : usdFormatter2;
  return formatter.format(value);
}

export function formatPercent(value: number) {
  return percentFormatter.format(value / 100);
}

/**
 * Formats a number as USD with explicit +/- sign prefix.
 * E.g. 1234.56 => "+$1,234.56", -500 => "-$500.00"
 */
export function formatUsd(value: number): string {
  const formatted = usdFormatter2.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Formats a percentage value with explicit +/- sign prefix.
 * E.g. 12.34 => "+12.34%", -5.67 => "-5.67%"
 */
export function formatSignedPercent(value: number): string {
  const abs = Math.abs(value);
  const formatted = `${abs.toFixed(2)}%`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Formats a large number in compact notation.
 * E.g. 1234567 => "$1.2M", 45678 => "$45.7K"
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function formatShortDate(value: string) {
  try {
    return shortDateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function formatBucketLabel(bucket: string, interval: IntervalOption) {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) {
    return bucket;
  }

  if (interval === "month") {
    return monthYearFormatter.format(date);
  }

  if (interval === "week") {
    return `Wk of ${dayMonthFormatter.format(date)}`;
  }

  return dayMonthFormatter.format(date);
}

export function formatChainLabel(chainId: number | null) {
  if (!chainId) return "—";
  return CHAIN_NAME_BY_ID[chainId] ?? `Chain ${chainId}`;
}

function toIntervalBucketIso(date: Date, interval: IntervalOption): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if (interval === "month") {
    return new Date(Date.UTC(year, month, 1)).toISOString();
  }

  if (interval === "week") {
    // Monday-based week start in UTC.
    const utcDay = date.getUTCDay(); // 0=Sun..6=Sat
    const diff = (utcDay + 6) % 7; // Mon=0..Sun=6
    return new Date(Date.UTC(year, month, day - diff)).toISOString();
  }

  return new Date(Date.UTC(year, month, day)).toISOString();
}

export function aggregateCurvePoints(points: CurvePoint[], interval: IntervalOption): CurvePoint[] {
  if (interval === "day") return points;

  let isSorted = true;
  for (let i = 1; i < points.length; i += 1) {
    if (points[i - 1]!.t.localeCompare(points[i]!.t) > 0) {
      isSorted = false;
      break;
    }
  }

  const ordered = isSorted ? points : points.slice().sort((a, b) => a.t.localeCompare(b.t));
  const buckets = new Map<string, CurvePoint>();

  for (const point of ordered) {
    const parsed = new Date(point.t);
    if (Number.isNaN(parsed.getTime())) continue;
    const bucket = toIntervalBucketIso(parsed, interval);

    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, { ...point, t: bucket });
      continue;
    }

    buckets.set(bucket, {
      t: bucket,
      pnlUsd: point.pnlUsd,
      dailyPnlUsd: existing.dailyPnlUsd + point.dailyPnlUsd,
      trades: existing.trades + point.trades,
    });
  }

  return Array.from(buckets.values()).sort((a, b) => a.t.localeCompare(b.t));
}

