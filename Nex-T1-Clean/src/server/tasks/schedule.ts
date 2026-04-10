import { addMilliseconds } from "date-fns";

import type { TaskSchedule, TaskScheduleCondition } from "@/modules/tasks";
import type { TaskScheduleRow } from "@/server/tasks/types";

const LONG_TERM_HORIZON_MS: Record<string, number> = {
  "1w": 7 * 24 * 60 * 60 * 1000,
  "1m": 30 * 24 * 60 * 60 * 1000,
  "3m": 90 * 24 * 60 * 60 * 1000,
  "6m": 180 * 24 * 60 * 60 * 1000,
  "12m": 365 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
  "2y": 2 * 365 * 24 * 60 * 60 * 1000,
};

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

type ComputeOptions = {
  from?: Date;
};

export function parseScheduleRow(row?: TaskScheduleRow | null): TaskSchedule | null {
  if (!row) {
    return null;
  }
  if (row.definition) {
    return row.definition;
  }
  // Fallback reconstruction for legacy rows.
  const base: TaskSchedule = {
    type: (row.schedule_type as TaskSchedule["type"]) ?? "future",
  };
  if (row.run_at) {
    base.runAt = row.run_at;
  }
  if (row.offset_ms != null) {
    base.offsetMs = row.offset_ms;
  }
  if (row.long_term_start) {
    base.longTermStart = row.long_term_start;
  }
  if (row.recurrence) {
    base.recurrence = row.recurrence as TaskSchedule["recurrence"];
  }
  if (row.summary) {
    base.summary = row.summary;
  }
  return base;
}

export function computeInitialNextRunAt(schedule: TaskSchedule, options: ComputeOptions = {}): Date | null {
  const anchor = options.from ?? new Date();
  switch (schedule.type) {
    case "future":
      return parseTimestamp(schedule.runAt) ?? null;
    case "short_term": {
      const offset = schedule.offsetMs ?? 0;
      return offset > 0 ? addMilliseconds(anchor, offset) : anchor;
    }
    case "long_term":
      return computeLongTermAnchor(schedule, anchor);
    case "loop":
      return computeNextLoopOccurrence(schedule, null, anchor);
    case "conditional":
      return parseTimestamp(schedule.runAt) ?? anchor;
    default:
      return anchor;
  }
}

export function computeNextOccurrence(
  schedule: TaskSchedule,
  lastRunAt: Date | null,
  options: ComputeOptions = {},
): Date | null {
  const anchor = options.from ?? new Date();
  switch (schedule.type) {
    case "future":
      return null; // one-off
    case "short_term": {
      const offset = schedule.offsetMs ?? 0;
      const base = lastRunAt ?? anchor;
      return offset > 0 ? addMilliseconds(base, offset) : addMilliseconds(base, 60 * 1000);
    }
    case "long_term": {
      const base = lastRunAt ?? computeLongTermAnchor(schedule, anchor);
      if (!base) return null;
      return computeLongTermAnchor(schedule, base);
    }
    case "loop":
      return computeNextLoopOccurrence(schedule, lastRunAt, anchor);
    case "conditional":
      // revisit conditions frequently; if runAt provided, reuse
      return parseTimestamp(schedule.runAt) ?? addMilliseconds(anchor, 60 * 1000);
    default:
      return null;
  }
}

export function extractScheduleConditions(schedule: TaskSchedule | null): TaskScheduleCondition[] {
  if (!schedule?.conditions) {
    return [];
  }
  return schedule.conditions;
}

function computeLongTermAnchor(schedule: TaskSchedule, reference: Date): Date | null {
  const start = parseTimestamp(schedule.longTermStart) ?? reference;
  const horizons = Array.isArray(schedule.horizons) ? schedule.horizons : [];
  if (horizons.length === 0) {
    return start;
  }
  const offsets = horizons
    .map((code) => LONG_TERM_HORIZON_MS[code])
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  if (!offsets.length) {
    return start;
  }
  const base = reference.getTime();
  for (const offset of offsets) {
    const target = new Date(start.getTime() + offset);
    if (target.getTime() > base) {
      return target;
    }
  }
  const lastOffset = offsets[offsets.length - 1];
  return new Date(start.getTime() + lastOffset);
}

function computeNextLoopOccurrence(schedule: TaskSchedule, lastRun: Date | null, now: Date): Date | null {
  const recurrence = schedule.recurrence;
  if (!recurrence) {
    return null;
  }
  const interval = Math.max(1, recurrence.interval ?? 1);
  const start = parseTimestamp(recurrence.startAt) ?? now;
  const reference = lastRun ?? now;
  switch (recurrence.frequency) {
    case "hourly": {
      const base = lastRun ?? start;
      return addDuration(base, "hours", interval);
    }
    case "daily": {
      const base = reference > start ? reference : start;
      return addDuration(base, "days", interval);
    }
    case "weekly": {
      const weekdays = Array.isArray(recurrence.weekdays) ? recurrence.weekdays : [];
      return computeNextWeeklyOccurrence(start, weekdays, reference, interval);
    }
    case "monthly": {
      const base = reference > start ? reference : start;
      return addDuration(base, "months", interval);
    }
    default:
      return addDuration(reference, "days", interval);
  }
}

function computeNextWeeklyOccurrence(
  start: Date,
  weekdays: string[],
  reference: Date,
  interval: number,
): Date | null {
  const normalized = weekdays
    .map((day) => WEEKDAY_INDEX[day.toLowerCase() as keyof typeof WEEKDAY_INDEX])
    .filter((value): value is number => typeof value === "number")
    .sort();

  const baseTime = start.getUTCHours() * 60 + start.getUTCMinutes();
  const baseDay = reference.getUTCDay();
  const baseDate = new Date(reference);

  for (let weekOffset = 0; weekOffset <= interval; weekOffset += 1) {
    for (const targetDay of normalized.length ? normalized : [baseDay]) {
      const deltaDays = (targetDay - baseDay + 7) % 7 + weekOffset * 7 * interval;
      const candidate = new Date(baseDate);
      candidate.setUTCDate(candidate.getUTCDate() + deltaDays);
      candidate.setUTCHours(0, 0, 0, 0);
      candidate.setUTCMinutes(baseTime);
      if (candidate > reference) {
        return candidate;
      }
    }
  }

  const fallback = new Date(reference);
  fallback.setUTCDate(fallback.getUTCDate() + 7 * interval);
  return fallback;
}

function addDuration(date: Date, unit: "hours" | "days" | "months", count: number): Date {
  const next = new Date(date);
  if (unit === "hours") {
    next.setUTCHours(next.getUTCHours() + count);
  } else if (unit === "days") {
    next.setUTCDate(next.getUTCDate() + count);
  } else {
    next.setUTCMonth(next.getUTCMonth() + count);
  }
  return next;
}

function parseTimestamp(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

