import type { ScheduleTaskPayload } from "@/hooks/tasks/use-schedule-task";
import type { NotificationChannel, TaskActionInput } from "@/modules/tasks/action-schema";

import {
  type TaskSchedulerFormValues,
  shortTermUnits,
  WeekdayValue,
  defaultDate,
} from "./schema";

export function buildPayload(values: TaskSchedulerFormValues): ScheduleTaskPayload {
  const action = buildActionPayload(values);
  const baseTask = {
    title: values.title.trim(),
    description: values.description?.trim() || undefined,
    agent: values.agent?.trim() || undefined,
    team: values.team?.trim() || undefined,
    kind: values.kind?.trim() || undefined,
    action,
    notificationChannels: buildNotificationChannels(values, action),
  } as ScheduleTaskPayload["task"];

  if (values.scheduleType === "future") {
    const runAt = toIso(values.futureDateTime);
    if (!runAt) {
      throw new Error("Invalid future date/time");
    }
    return {
      task: baseTask,
      schedule: {
        type: "future",
        runAt,
      },
    };
  }

  if (values.scheduleType === "short_term") {
    const offset = Number(values.shortTermValue ?? 0);
    const unit = shortTermUnits.find((item) => item.value === values.shortTermUnit)?.multiplier ?? 0;
    if (!offset || !unit) {
      throw new Error("Short-term configuration incomplete");
    }
    return {
      task: baseTask,
      schedule: {
        type: "short_term",
        offsetMs: offset * unit,
      },
    };
  }

  if (values.scheduleType === "long_term") {
    const startAt = combineDateAndTime(values.longTermStartDate, values.longTermStartTime);
    if (!startAt) {
      throw new Error("Invalid long-term anchor");
    }
    return {
      task: baseTask,
      schedule: {
        type: "long_term",
        horizons: Array.from(new Set(values.longTermSelections)),
        longTermStart: startAt,
      },
    };
  }

  if (values.scheduleType === "conditional") {
    return {
      task: baseTask,
      schedule: {
        type: "conditional",
        conditions: values.conditionalConditions.map((condition) => ({
          ...condition,
          thresholdPercent: parseOptionalNumber(condition.thresholdPercent),
          thresholdValue: parseOptionalNumber(condition.thresholdValue),
        })),
      },
    };
  }

  const startAt = combineDateAndTime(values.loopStartDate, values.loopStartTime);
  if (!startAt) {
    throw new Error("Invalid loop start date");
  }
  return {
    task: baseTask,
    schedule: {
      type: "loop",
      recurrence: {
        frequency: values.loopFrequency ?? "daily",
        interval: Math.max(1, Number(values.loopInterval ?? "1")),
        startAt,
        timezone: values.loopTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        weekdays:
          values.loopFrequency === "weekly"
            ? (Array.from(new Set(values.loopWeekdays)) as WeekdayValue[])
            : undefined,
      },
    },
  };
}

export function buildActionPayload(values: TaskSchedulerFormValues): TaskActionInput {
  if (values.actionType === "dex_trade") {
    return {
      type: "dex_trade",
      venue: values.tradeVenue ?? "0x",
      chainId: Number(values.tradeChainId ?? "1"),
      side: values.tradeSide ?? "buy",
      baseToken: values.tradeBaseToken?.trim() || "ETH",
      quoteToken: values.tradeQuoteToken?.trim() || "USDC",
      amount: values.tradeAmount ?? "0",
      amountMode: values.tradeAmountMode ?? "sell",
      slippageBps: Number(values.tradeSlippage ?? "50"),
      executionMode: values.tradeExecutionMode ?? "simulate",
      allowPartialFill: false,
    };
  }

  const deliver: NotificationChannel[] = [];
  if (values.newsDeliverInApp) {
    deliver.push("in_app");
  }
  if (values.newsDeliverEmail) {
    deliver.push("email");
  }

  return {
    type: "news_digest",
    topic: values.newsTopic?.trim() || "daily crypto highlights",
    limit: Number(values.newsLimit ?? "6"),
    deliver: (deliver.length ? deliver : ["in_app"]) as [NotificationChannel, ...NotificationChannel[]],
    email: values.newsDeliverEmail ? values.newsEmail?.trim() : undefined,
    includeComments: false,
  };
}

export function buildNotificationChannels(
  values: TaskSchedulerFormValues,
  action: TaskActionInput,
): NotificationChannel[] {
  if (action.type === "news_digest") {
    return action.deliver;
  }
  return ["in_app"];
}

export function toIso(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function combineDateAndTime(dateValue?: string | null, timeValue?: string | null): string | null {
  if (!dateValue && !timeValue) {
    return null;
  }
  const date = dateValue && dateValue.length > 0 ? dateValue : defaultDate();
  const time = timeValue && timeValue.length > 0 ? timeValue : "00:00";
  const composed = new Date(`${date}T${time}`);
  return Number.isNaN(composed.getTime()) ? null : composed.toISOString();
}

export function parseOptionalNumber(value?: string | null): number | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
