import type { AutomationSummary, AttachmentFingerprint } from "./types";

export type TelemetryMetadata = Record<string, string | number | boolean>;

export const buildAutomationTelemetry = (summary: AutomationSummary): TelemetryMetadata => ({
  automation_enabled_count: summary.enabled.length,
  automation_disabled_count: summary.disabled.length,
  automation_disabled_actions: summary.disabled.length > 0 ? summary.disabled.join(",") : "none",
});

export const buildAttachmentTelemetry = (
  fingerprint: AttachmentFingerprint,
): TelemetryMetadata | undefined => {
  if (!fingerprint.hasAttachmentTelemetry) {
    return undefined;
  }

  const { sha256 } = fingerprint;
  return {
    attachment_present: true,
    attachment_fingerprint: sha256 ?? "none",
  } satisfies TelemetryMetadata;
};

export const mergeTelemetry = (
  ...entries: Array<TelemetryMetadata | undefined>
): TelemetryMetadata | undefined => {
  const defined = entries.filter((entry): entry is TelemetryMetadata => Boolean(entry));
  if (defined.length === 0) {
    return undefined;
  }
  return defined.reduce((acc, entry) => Object.assign(acc, entry), {} as TelemetryMetadata);
};

const COMPLEXITY_KEYWORDS = [
  "plan",
  "build",
  "ultrathink",
  "think hard",
  "think deeply",
  "think thoroughly",
  "think carefully",
  "think critically",
  "think logically",
  "think rationally",
  "think systematically",
  "think comprehensively",
  "conduct deep research",
  "conduct extensive research",
  "conduct thorough research",
  "conduct detailed research",
  "conduct in-depth research",
  "conduct comprehensive research",
  "conduct rigorous research",
  "conduct systematic research",
  "conduct analytical research",
  "conduct evaluative research",
  "design",
  "implement",
  "integrate",
  "orchestrate",
  "architect",
  "debug",
  "analyze",
  "optimize",
  "assess",
  "critique",
  "improve",
];

/**
 * Estimates tool demand based on message complexity.
 * Used for routing and resource allocation decisions.
 */
export function estimateToolDemand(input?: string): number {
  if (!input) {
    return 1;
  }
  const normalized = input.toLowerCase();
  const keywordHits = COMPLEXITY_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;
  const lengthScore = normalized.length > 480 ? 3 : normalized.length > 200 ? 2 : 1;
  return Math.min(keywordHits + lengthScore, 6);
}
