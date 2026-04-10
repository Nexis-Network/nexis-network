import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { NotificationChannel, TaskActionInput } from "@/modules/tasks/action-schema";

export const scheduleOptions = [
  { value: "future", label: "Future date", description: "Launch at an explicit date & time" },
  { value: "short_term", label: "Short-term", description: "Delay by milliseconds to weeks" },
  { value: "long_term", label: "Long-term", description: "Plan 1 week to 2 years out" },
  { value: "conditional", label: "Conditional", description: "Watch market, news, or holders" },
  { value: "loop", label: "Loop", description: "Repeat daily, weekly, or monthly" },
] as const;

export type ScheduleType = (typeof scheduleOptions)[number]["value"];

export const shortTermUnits = [
  { value: "milliseconds", label: "Milliseconds", multiplier: 1 },
  { value: "seconds", label: "Seconds", multiplier: 1_000 },
  { value: "minutes", label: "Minutes", multiplier: 60_000 },
  { value: "hours", label: "Hours", multiplier: 60 * 60_000 },
  { value: "days", label: "Days", multiplier: 24 * 60 * 60_000 },
  { value: "weeks", label: "Weeks", multiplier: 7 * 24 * 60 * 60_000 },
] as const;

export type ShortTermUnit = (typeof shortTermUnits)[number]["value"];

export const longTermHorizonOptions = [
  { value: "1w", label: "1 week" },
  { value: "1m", label: "1 month" },
  { value: "3m", label: "3 months" },
  { value: "6m", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "2y", label: "2 years" },
] as const;

export const weekdayOptions = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;

export type WeekdayValue = (typeof weekdayOptions)[number]["value"];
export const weekdayEnumValues = weekdayOptions.map((option) => option.value) as [WeekdayValue, ...WeekdayValue[]];

export const conditionTypeOptions = [
  { value: "market_price_percent", label: "Price change %" },
  { value: "market_price_amount", label: "Price change $" },
  { value: "trade_volume", label: "Trade volume" },
  { value: "news", label: "News keyword" },
  { value: "portfolio_percent", label: "Portfolio % change" },
  { value: "holder_change", label: "Holder count change" },
  { value: "smart_contract_event", label: "Smart contract event" },
] as const;

export type ConditionType = (typeof conditionTypeOptions)[number]["value"];

export const actionOptions = [
  { value: "news_digest", label: "News digest & email summary" },
  { value: "dex_trade", label: "Buy / Sell tokens" },
] as const;

export type ActionType = (typeof actionOptions)[number]["value"];

export const dexVenueValues = ["0x", "uniswap", "pancakeswap"] as const;
export type DexVenueValue = (typeof dexVenueValues)[number];

export const conditionSchema = z.object({
  type: z.enum(conditionTypeOptions.map((option) => option.value) as [ConditionType, ...ConditionType[]]),
  asset: z.string().optional(),
  symbol: z.string().optional(),
  direction: z.enum(["above", "below"]).optional(),
  thresholdPercent: z.string().optional(),
  thresholdValue: z.string().optional(),
  keyword: z.string().optional(),
  contract: z.string().optional(),
  eventSignature: z.string().optional(),
  portfolioSlice: z.string().optional(),
});

export const formSchema = z
  .object({
    title: z.string().min(3, "Provide a task title"),
    description: z.string().optional(),
    agent: z.string().optional(),
    team: z.string().optional(),
    kind: z.string().optional(),
    scheduleType: z.enum(scheduleOptions.map((option) => option.value) as [ScheduleType, ...ScheduleType[]]),
    futureDateTime: z.string().optional(),
    shortTermValue: z.string().optional(),
    shortTermUnit: z.enum(shortTermUnits.map((unit) => unit.value) as [ShortTermUnit, ...ShortTermUnit[]]).optional(),
    longTermSelections: z.array(z.string()),
    longTermStartDate: z.string().optional(),
    longTermStartTime: z.string().optional(),
    conditionalConditions: z.array(conditionSchema),
    loopFrequency: z.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
    loopInterval: z.string().optional(),
    loopStartDate: z.string().optional(),
    loopStartTime: z.string().optional(),
    loopTimezone: z.string().optional(),
    loopWeekdays: z.array(z.enum(weekdayEnumValues)),
    actionType: z.enum(actionOptions.map((option) => option.value) as [ActionType, ...ActionType[]]),
    newsTopic: z.string().optional(),
    newsLimit: z.string().optional(),
    newsDeliverInApp: z.boolean().default(true),
    newsDeliverEmail: z.boolean().default(false),
    newsEmail: z.string().optional(),
    tradeVenue: z.enum(dexVenueValues).optional(),
    tradeChainId: z.string().optional(),
    tradeSide: z.enum(["buy", "sell"]).optional(),
    tradeBaseToken: z.string().optional(),
    tradeQuoteToken: z.string().optional(),
    tradeAmount: z.string().optional(),
    tradeAmountMode: z.enum(["sell", "buy"]).optional(),
    tradeSlippage: z.string().optional(),
    tradeExecutionMode: z.enum(["simulate", "execute"]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.scheduleType === "future" && !values.futureDateTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a date and time", path: ["futureDateTime"] });
    }

    if (values.scheduleType === "short_term") {
      if (!values.shortTermValue || Number(values.shortTermValue) <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a positive value", path: ["shortTermValue"] });
      }
      if (!values.shortTermUnit) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a unit", path: ["shortTermUnit"] });
      }
    }

    if (values.scheduleType === "long_term" && values.longTermSelections.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose at least one horizon", path: ["longTermSelections"] });
    }

    if (values.scheduleType === "conditional") {
      if (values.conditionalConditions.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least one condition", path: ["conditionalConditions"] });
      }

      values.conditionalConditions.forEach((condition, index) => {
        const basePath: (string | number)[] = ["conditionalConditions", index];
        if (
          (condition.type === "market_price_percent" || condition.type === "market_price_amount" || condition.type === "trade_volume") &&
          !condition.asset &&
          !condition.symbol
        ) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide an asset or symbol", path: [...basePath, "asset"] });
        }
        if ((condition.type === "market_price_percent" || condition.type === "market_price_amount") && !condition.direction) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose above/below", path: [...basePath, "direction"] });
        }
        if (condition.type === "market_price_percent" && !condition.thresholdPercent) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set a percent threshold", path: [...basePath, "thresholdPercent"] });
        }
        if ((condition.type === "market_price_amount" || condition.type === "trade_volume") && !condition.thresholdValue) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set a numeric threshold", path: [...basePath, "thresholdValue"] });
        }
        if (condition.type === "news" && !condition.keyword) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add a keyword", path: [...basePath, "keyword"] });
        }
        if (condition.type === "portfolio_percent" && !condition.thresholdPercent) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set the % change", path: [...basePath, "thresholdPercent"] });
        }
        if (condition.type === "holder_change" && !condition.thresholdPercent) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Set the % change", path: [...basePath, "thresholdPercent"] });
        }
        if (condition.type === "smart_contract_event" && (!condition.contract || !condition.eventSignature)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide contract + event signature", path: [...basePath, "contract"] });
        }
      });
    }

    if (values.scheduleType === "loop") {
      if (!values.loopFrequency) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a frequency", path: ["loopFrequency"] });
      }
      if (!values.loopInterval || Number(values.loopInterval) <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interval must be positive", path: ["loopInterval"] });
      }
      if (values.loopFrequency === "weekly" && values.loopWeekdays.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pick at least one weekday", path: ["loopWeekdays"] });
      }
      if (!values.loopStartDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a start date", path: ["loopStartDate"] });
      }
      if (!values.loopStartTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a start time", path: ["loopStartTime"] });
      }
    }

    if (values.actionType === "news_digest") {
      if (!values.newsTopic || values.newsTopic.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a topic", path: ["newsTopic"] });
      }
      const numericLimit = Number(values.newsLimit ?? "6");
      if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Story limit must be positive", path: ["newsLimit"] });
      }
      if (!values.newsDeliverInApp && !values.newsDeliverEmail) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one delivery channel", path: ["newsDeliverInApp"] });
      }
      if (values.newsDeliverEmail && !values.newsEmail) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide an email address", path: ["newsEmail"] });
      }
    }

    if (values.actionType === "dex_trade") {
      if (!values.tradeVenue) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select a venue", path: ["tradeVenue"] });
      }
      const chainId = Number(values.tradeChainId ?? "1");
      if (!Number.isFinite(chainId) || chainId <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid chain id", path: ["tradeChainId"] });
      }
      if (!values.tradeSide) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select buy or sell", path: ["tradeSide"] });
      }
      if (!values.tradeBaseToken) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Base token required", path: ["tradeBaseToken"] });
      }
      if (!values.tradeQuoteToken) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quote token required", path: ["tradeQuoteToken"] });
      }
      if (!values.tradeAmount || Number(values.tradeAmount) <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Amount must be positive", path: ["tradeAmount"] });
      }
      const slippage = Number(values.tradeSlippage ?? "50");
      if (!Number.isFinite(slippage) || slippage <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Slippage must be positive", path: ["tradeSlippage"] });
      }
    }
  });

export type TaskSchedulerFormValues = z.infer<typeof formSchema>;
export type SchedulerResolver = Resolver<TaskSchedulerFormValues>;
export const taskSchedulerResolver: SchedulerResolver = zodResolver(formSchema) as SchedulerResolver;

export const defaultDate = () => new Date().toISOString().slice(0, 10);

export const createDefaultValues = (defaults?: { agent?: string; team?: string }): TaskSchedulerFormValues => ({
  title: "",
  description: "",
  agent: defaults?.agent ?? "",
  team: defaults?.team ?? "",
  kind: "",
  scheduleType: "future",
  futureDateTime: "",
  shortTermUnit: "hours",
  shortTermValue: "1",
  longTermSelections: [],
  longTermStartDate: defaultDate(),
  longTermStartTime: "09:00",
  conditionalConditions: [],
  loopFrequency: "daily",
  loopInterval: "1",
  loopStartDate: defaultDate(),
  loopStartTime: "09:00",
  loopTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  loopWeekdays: ["mon"],
  actionType: "news_digest",
  newsTopic: "daily crypto highlights",
  newsLimit: "6",
  newsDeliverInApp: true,
  newsDeliverEmail: false,
  newsEmail: "",
  tradeVenue: "0x",
  tradeChainId: "1",
  tradeSide: "buy",
  tradeBaseToken: "",
  tradeQuoteToken: "USDC",
  tradeAmount: "",
  tradeAmountMode: "sell",
  tradeSlippage: "50",
  tradeExecutionMode: "simulate",
});

export type SupportedAction = TaskActionInput["type"];
export type SupportedNotificationChannel = NotificationChannel;
