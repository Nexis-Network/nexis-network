import { z } from "zod";

import {
  DEFAULT_ASSET_INSIGHT_TTL_HOURS,
  INSIGHT_SENTENCE_MAX_LENGTH,
  MAX_ASSET_INSIGHT_TTL_HOURS,
  MIN_ASSET_INSIGHT_TTL_HOURS,
  PORTFOLIO_INSIGHT_TTL_HOURS,
} from "@/server/insights/constants";

const ADVICE_LANGUAGE_RE =
  /\b(buy|sell|hold|accumulate|entry|exit|target|stop[-\s]?loss|financial advice|recommend(?:ed|ation)?|you should|should consider|must buy|must sell)\b/i;

export const InsightOutputSchema = z.object({
  sentence: z.string().trim().min(1).max(INSIGHT_SENTENCE_MAX_LENGTH),
  reasonCodes: z.array(z.string().trim().min(1).max(48)).max(6),
  confidence: z.number().min(0).max(1),
  category: z.enum(["portfolio", "asset", "fallback_news"]),
});

export function countSentences(value: string): number {
  return value
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

export function validateInsightSentence(sentence: string): string {
  const trimmed = String(sentence ?? "").trim();

  if (trimmed.length === 0) {
    throw new Error("Insight sentence cannot be empty.");
  }

  if (trimmed.includes("\n")) {
    throw new Error("Insight sentence must stay on one line.");
  }

  if (trimmed.length > INSIGHT_SENTENCE_MAX_LENGTH) {
    throw new Error(
      `Insight sentence must be ${INSIGHT_SENTENCE_MAX_LENGTH} characters or fewer.`,
    );
  }

  if (countSentences(trimmed) !== 1) {
    throw new Error("Insight sentence must contain exactly one sentence.");
  }

  if (ADVICE_LANGUAGE_RE.test(trimmed)) {
    throw new Error("Insight sentence cannot contain financial advice language.");
  }

  return trimmed;
}

export function ensureValidInsightOutput(input: unknown) {
  const parsed = InsightOutputSchema.parse(input);
  return {
    ...parsed,
    sentence: validateInsightSentence(parsed.sentence),
    reasonCodes: parsed.reasonCodes.map((reasonCode) => reasonCode.trim()),
    confidence: Number(parsed.confidence.toFixed(2)),
  };
}

function addHours(baseDate: Date, hours: number): Date {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

export function resolveAssetInsightTtlHours(
  env: Partial<Record<string, string | undefined>> = process.env,
): number {
  const parsed = Number(env.AI_INSIGHTS_ASSET_TTL_HOURS);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ASSET_INSIGHT_TTL_HOURS;
  }

  return Math.min(
    MAX_ASSET_INSIGHT_TTL_HOURS,
    Math.max(MIN_ASSET_INSIGHT_TTL_HOURS, Math.floor(parsed)),
  );
}

export function resolveInsightExpiry(
  scope: "portfolio" | "asset",
  now = new Date(),
  env: Partial<Record<string, string | undefined>> = process.env,
): Date {
  if (scope === "portfolio") {
    return addHours(now, PORTFOLIO_INSIGHT_TTL_HOURS);
  }

  return addHours(now, resolveAssetInsightTtlHours(env));
}

export function isInsightFresh(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() > now.getTime();
}
