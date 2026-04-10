import { z } from "zod";

const RawTaskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    status: z.string().min(1).optional(),
    agent: z.string().nullable().optional(),
    agent_id: z.string().nullable().optional(),
    team: z.string().nullable().optional(),
    kind: z.string().nullable().optional(),
    plan_id: z.string().nullable().optional(),
    planId: z.string().nullable().optional(),
    session_id: z.string().nullable().optional(),
    inputs: z.record(z.string(), z.unknown()).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    scheduled_for: z.string().nullable().optional(),
    scheduledFor: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    progress: z.number().nullable().optional(),
    last_summary: z.string().nullable().optional(),
    lastSummary: z.string().nullable().optional(),
    last_error: z.string().nullable().optional(),
    lastError: z.string().nullable().optional(),
    horizon: z.string().nullable().optional(),
  })
  .passthrough();

const TaskListPayloadSchema = z
  .object({
    items: z.array(RawTaskSchema).optional(),
    data: z.array(RawTaskSchema).optional(),
    tasks: z.array(RawTaskSchema).optional(),
    total: z.number().int().nonnegative().optional(),
    count: z.number().int().nonnegative().optional(),
    has_more: z.boolean().optional(),
    hasMore: z.boolean().optional(),
    next_offset: z.number().int().nullable().optional(),
    nextOffset: z.number().int().nullable().optional(),
  })
  .passthrough();

export const TASK_STATUS_ORDER = [
  "pending",
  "scheduled",
  "in_progress",
  "paused",
  "completed",
  "failed",
  "cancelled",
] as const;

export type TaskStatus =
  | (typeof TASK_STATUS_ORDER)[number]
  | "queued"
  | "unknown"
  | "set"
  | "started"
  | "requires_action";

export type NormalizedTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  rawStatus: string;
  scheduledFor: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  progress: number | null;
  inputs: Record<string, UntypedJson> | null;
  agent: string | null;
  team: string | null;
  kind: string | null;
  planId: string | null;
  horizon: string | null;
  metadata: Record<string, UntypedJson> | null;
  lastSummary: string | null;
  lastError: string | null;
};

export type NormalizedTaskList = {
  tasks: NormalizedTask[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  fetchedAt: string;
};

export function normalizeTaskList(payload: UntypedJson): NormalizedTaskList {
  const parsed = TaskListPayloadSchema.parse(payload ?? {});
  const items = parsed.items ?? parsed.data ?? parsed.tasks ?? [];
  const normalized = items.map((task) => normalizeTask(task));
  const total = parsed.total ?? parsed.count ?? normalized.length;
  const nextOffset = parsed.next_offset ?? parsed.nextOffset ?? null;
  const hasMore =
    parsed.has_more ??
    parsed.hasMore ??
    (typeof nextOffset === "number" ? nextOffset >= (normalized.length ? normalized.length : 0) : false);

  return {
    tasks: normalized,
    total,
    hasMore,
    nextOffset: typeof nextOffset === "number" ? nextOffset : null,
    fetchedAt: new Date().toISOString(),
  };
}

export function normalizeTask(raw: UntypedJson): NormalizedTask {
  const parsed = RawTaskSchema.parse(raw ?? {});
  const status = normalizeTaskStatus(parsed.status ?? "");
  const createdAt = coalesceTimestamp(parsed.created_at, parsed.createdAt);
  const updatedAt = coalesceTimestamp(parsed.updated_at, parsed.updatedAt);
  const scheduledFor = coalesceTimestamp(parsed.scheduled_for, parsed.scheduledFor);
  const progress = normalizeProgress(parsed.progress);
  const inputs = isRecord(parsed.inputs) ? parsed.inputs : null;
  const metadata = isRecord(parsed.metadata) ? parsed.metadata : null;

  return {
    id: parsed.id,
    title: parsed.title,
    description: parsed.description ?? null,
    status,
    rawStatus: (parsed.status ?? "").toString(),
    scheduledFor,
    createdAt,
    updatedAt,
    progress,
    inputs,
    agent: coerceString(parsed.agent ?? parsed.agent_id),
    team: coerceString(parsed.team),
    kind: coerceString(parsed.kind),
    planId: coerceString(parsed.plan_id ?? parsed.planId),
    horizon: coerceString(parsed.horizon),
    metadata,
    lastSummary: coerceString(parsed.last_summary ?? parsed.lastSummary),
    lastError: coerceString(parsed.last_error ?? parsed.lastError),
  };
}

function coerceString(value: UntypedJson): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function coalesceTimestamp(...candidates: Array<UntypedJson>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const ts = Date.parse(candidate);
      if (!Number.isNaN(ts)) {
        return new Date(ts).toISOString();
      }
    }
  }
  return null;
}

function normalizeTaskStatus(status: string): TaskStatus {
  const normalized = status?.toLowerCase?.() ?? "";
  if (!normalized) {
    return "unknown";
  }
  if (normalized === "in-progress" || normalized === "in progress" || normalized === "started") {
    return "in_progress";
  }
  if (normalized === "queued" || normalized === "waiting" || normalized === "backlog") {
    return "queued";
  }
  if (normalized === "complete") {
    return "completed";
  }
  if (normalized === "paused") {
    return "paused";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }
  if (normalized === "scheduled" || normalized === "future") {
    return "scheduled";
  }
  if (normalized === "running") {
    return "in_progress";
  }
  if (normalized === "pending" || normalized === "created") {
    return "pending";
  }
  if (normalized === "failed" || normalized === "error") {
    return "failed";
  }
  if (normalized === "in_progress" || normalized === "completed") {
    return normalized as TaskStatus;
  }
  if (
    normalized === "queued" ||
    normalized === "set" ||
    normalized === "started" ||
    normalized === "requires_action" ||
    normalized === "scheduled" ||
    normalized === "paused" ||
    normalized === "cancelled" ||
    normalized === "pending"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeProgress(progress: UntypedJson): number | null {
  if (typeof progress !== "number" || !Number.isFinite(progress)) {
    return null;
  }
  if (progress <= 1) {
    return clamp(progress, 0, 1);
  }
  if (progress <= 100) {
    return clamp(progress / 100, 0, 1);
  }
  return 1;
}

const SCHEDULE_TYPES = ["future", "short_term", "long_term", "conditional", "loop"] as const;
const WEEKDAY_VALUES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const TaskScheduleConditionSchema = z
  .object({
    type: z.enum([
      "market_price_percent",
      "market_price_amount",
      "trade_volume",
      "news",
      "portfolio_percent",
      "holder_change",
      "smart_contract_event",
    ]),
    asset: z.string().optional(),
    symbol: z.string().optional(),
    market: z.string().optional(),
    direction: z.enum(["above", "below", "equals"]).optional(),
    thresholdPercent: z.number().optional(),
    thresholdValue: z.number().optional(),
    windowMinutes: z.number().optional(),
    keyword: z.string().optional(),
    source: z.string().optional(),
    portfolioSlice: z.string().optional(),
    chainId: z.string().optional(),
    contract: z.string().optional(),
    eventSignature: z.string().optional(),
  })
  .passthrough();

export const TaskScheduleSchema = z
  .object({
    type: z.enum(SCHEDULE_TYPES).default("future"),
    runAt: z.string().optional(),
    offsetMs: z.number().int().nonnegative().optional(),
    horizons: z.array(z.string()).optional(),
    longTermStart: z.string().optional(),
    recurrence: z
      .object({
        frequency: z.enum(["hourly", "daily", "weekly", "monthly"]),
        interval: z.number().int().positive().default(1),
        startAt: z.string().optional(),
        timezone: z.string().optional(),
        weekdays: z.array(z.enum(WEEKDAY_VALUES)).optional(),
      })
      .optional(),
    conditions: z.array(TaskScheduleConditionSchema).optional(),
    summary: z.string().optional(),
  })
  .passthrough();

export type TaskScheduleCondition = z.infer<typeof TaskScheduleConditionSchema>;
export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;
export type TaskScheduleBucket = "future" | "shortTerm" | "longTerm" | "conditional" | "loop" | "unscheduled";

export type TaskScheduleClassification = {
  schedule: TaskSchedule | null;
  bucket: TaskScheduleBucket;
  dueAt: number | null;
  isConditional: boolean;
  isLoop: boolean;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function extractTaskSchedule(task: NormalizedTask): TaskSchedule | null {
  const candidate = getScheduleCandidate(task.inputs) ?? getScheduleCandidate(task.metadata);
  if (!candidate) {
    return null;
  }
  const parsed = TaskScheduleSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function classifyTaskSchedule(task: NormalizedTask, options: { now?: number } = {}): TaskScheduleClassification {
  const now = options.now ?? Date.now();
  const schedule = extractTaskSchedule(task);
  const isConditional = schedule?.type === "conditional" || Boolean(schedule?.conditions?.length);
  const isLoop = schedule?.type === "loop" || Boolean(schedule?.recurrence);
  const dueAt = computeDueTimestamp(task, schedule, now);

  let bucket: TaskScheduleBucket = "unscheduled";

  if (isConditional) {
    bucket = "conditional";
  } else if (isLoop) {
    bucket = "loop";
  } else if (schedule?.type === "short_term") {
    bucket = "shortTerm";
  } else if (schedule?.type === "long_term") {
    bucket = "longTerm";
  } else if (schedule?.type === "future") {
    bucket = "future";
  } else if (task.horizon) {
    bucket = "longTerm";
  } else if (dueAt !== null) {
    bucket = dueAt - now <= WEEK_MS ? "shortTerm" : "longTerm";
  } else if (task.scheduledFor) {
    bucket = "future";
  }

  return {
    schedule,
    bucket,
    dueAt,
    isConditional,
    isLoop,
  };
}

export function describeTaskSchedule(task: NormalizedTask, options: { now?: number } = {}): string | null {
  const now = options.now ?? Date.now();
  const schedule = extractTaskSchedule(task);

  if (!schedule) {
    return formatAbsoluteDue(task.scheduledFor, now);
  }

  if (schedule.type === "conditional" || schedule.conditions?.length) {
    return formatConditionSummary(schedule.conditions ?? []);
  }

  if (schedule.type === "loop" || schedule.recurrence) {
    return formatLoopSummary(schedule.recurrence, now);
  }

  if (schedule.type === "short_term" && typeof schedule.offsetMs === "number") {
    return `Starts in ${formatDuration(schedule.offsetMs)}`;
  }

  if (schedule.type === "long_term") {
    if (schedule.horizons?.length) {
      const labels = schedule.horizons.map((h) => horizonLabel(h));
      return `Horizon: ${labels.join(", ")}`;
    }
    if (schedule.longTermStart) {
      return formatAbsoluteDue(schedule.longTermStart, now);
    }
  }

  const recurrenceStartAt = (schedule.recurrence as { startAt?: string } | undefined)?.startAt;
  const runAt = schedule.runAt ?? recurrenceStartAt ?? task.scheduledFor;
  return formatAbsoluteDue(runAt, now);
}

function formatConditionSummary(conditions: TaskScheduleCondition[]): string {
  if (!conditions.length) {
    return "Conditional trigger";
  }
  const summary = conditions.map((condition) => {
    switch (condition.type) {
      case "market_price_percent": {
        const direction = condition.direction === "below" ? "drops" : "rises";
        const asset = condition.asset || condition.symbol || "asset";
        return `${asset} ${direction} ${condition.thresholdPercent ?? 0}%`;
      }
      case "market_price_amount": {
        const direction = condition.direction === "below" ? "<" : ">";
        const asset = condition.asset || condition.symbol || "asset";
        return `${asset} price ${direction} $${condition.thresholdValue ?? 0}`;
      }
      case "trade_volume": {
        const asset = condition.asset || condition.symbol || "volume";
        return `${asset} volume ≥ ${condition.thresholdValue ?? 0}`;
      }
      case "news":
        return `News contains "${condition.keyword ?? "keyword"}"`;
      case "portfolio_percent":
        return `${condition.portfolioSlice ?? "Portfolio"} moves ${condition.thresholdPercent ?? 0}%`;
      case "holder_change":
        return `Holder count ${condition.direction === "below" ? "down" : "up"} ${condition.thresholdPercent ?? 0}%`;
      case "smart_contract_event":
        return `Event ${condition.eventSignature ?? "event"} on ${condition.contract ?? "contract"}`;
      default:
        return "Conditional trigger";
    }
  });
  return summary.join(" • ");
}

function formatLoopSummary(
  recurrence: TaskSchedule["recurrence"] | undefined,
  now: number,
): string {
  if (!recurrence) {
    return "Recurring automation";
  }
  const base = recurrence.frequency;
  const everyLabel = recurrence.interval > 1 ? `every ${recurrence.interval} ${base}s` : `every ${base}`;
  const weekdayLabel =
    recurrence.frequency === "weekly" && recurrence.weekdays?.length
      ? ` on ${uniqueWeekdays(recurrence.weekdays).map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}`
      : "";
  const startLabel = recurrence.startAt ? formatAbsoluteDue(recurrence.startAt, now) : "next available slot";
  return `${everyLabel}${weekdayLabel} • starts ${startLabel}`;
}

function formatAbsoluteDue(value: string | null | undefined, now: number): string | null {
  if (!value) {
    return null;
  }
  const date = safeDateParse(value);
  if (date === null) {
    return null;
  }
  const diff = date - now;
  const absMinutes = Math.abs(Math.round(diff / (60 * 1000)));

  if (Math.abs(diff) < 60 * 60 * 1000) {
    if (diff >= 0) {
      return absMinutes <= 1 ? "Due now" : `Due in ${absMinutes} min`;
    }
    return absMinutes <= 1 ? "Past due" : `${absMinutes} min overdue`;
  }

  if (Math.abs(diff) < 24 * 60 * 60 * 1000) {
    const hours = Math.round(diff / (60 * 60 * 1000));
    if (hours >= 0) {
      return `Due in ${hours} hour${hours === 1 ? "" : "s"}`;
    }
    const absHours = Math.abs(hours);
    return `${absHours} hour${absHours === 1 ? "" : "s"} overdue`;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatter.format(date);
}

function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 1000) {
    return `${abs} ms`;
  }
  const units: Array<[string, number]> = [
    ["second", 1000],
    ["minute", 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["week", 7 * 24 * 60 * 60 * 1000],
  ];

  for (let i = units.length - 1; i >= 0; i -= 1) {
    const [label, value] = units[i];
    if (abs >= value) {
      const count = Math.round(abs / value);
      return `${count} ${label}${count === 1 ? "" : "s"}`;
    }
  }
  return `${abs} ms`;
}

function horizonLabel(code: string): string {
  const mapping: Record<string, string> = {
    "1w": "1 week",
    "1m": "1 month",
    "3m": "3 months",
    "6m": "6 months",
    "12m": "12 months",
    "1y": "1 year",
    "2y": "2 years",
  };
  return mapping[code] ?? code;
}

function uniqueWeekdays(values: string[]): string[] {
  const set = new Set<string>();
  values.forEach((value) => {
    const normalized = value.toLowerCase();
    if (WEEKDAY_VALUES.includes(normalized as (typeof WEEKDAY_VALUES)[number])) {
      set.add(normalized);
    }
  });
  return Array.from(set);
}

function getScheduleCandidate(source: Record<string, UntypedJson> | null): UntypedJson {
  if (!source) {
    return null;
  }
  if ("schedule" in source) {
    return (source as Record<string, UntypedJson>).schedule;
  }
  if ("taskSchedule" in source) {
    return (source as Record<string, UntypedJson>).taskSchedule;
  }
  if ("scheduler" in source) {
    return (source as Record<string, UntypedJson>).scheduler;
  }
  return null;
}

function computeDueTimestamp(task: NormalizedTask, schedule: TaskSchedule | null, now: number): number | null {
  const direct = safeDateParse(task.scheduledFor);
  if (direct !== null) {
    return direct;
  }

  if (schedule?.runAt) {
    const runAt = safeDateParse(schedule.runAt);
    if (runAt !== null) {
      return runAt;
    }
  }

  if (schedule?.recurrence?.startAt) {
    const start = safeDateParse(schedule.recurrence.startAt);
    if (start !== null) {
      return start;
    }
  }

  if (schedule?.longTermStart) {
    const anchor = safeDateParse(schedule.longTermStart);
    if (anchor !== null) {
      return anchor;
    }
  }

  if (typeof schedule?.offsetMs === "number") {
    return now + schedule.offsetMs;
  }

  return null;
}

function safeDateParse(value: string | null | undefined): number | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: UntypedJson): value is Record<string, UntypedJson> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
