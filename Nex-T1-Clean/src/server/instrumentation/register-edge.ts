import { logger } from '@/lib/logger';

/**
 * Edge Runtime Instrumentation
 *
 * Domain: Observability
 * Responsibility: Initialize Sentry for edge runtime environments
 * Notes: Uses main @sentry/nextjs package which supports edge runtime natively
 */

const parseRate = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getEnv = (name: string): string | undefined => {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env[name];
};

export async function registerEdgeInstrumentation() {
  const dsn = getEnv("SENTRY_DSN") || getEnv("NEXT_PUBLIC_SENTRY_DSN");
  const isEnabled = typeof dsn === "string" && dsn.trim().length > 0;

  if (!isEnabled) {
    return;
  }

  try {
    // Use main @sentry/nextjs package which has built-in edge runtime support.
    // The Sentry SDK detects the runtime environment automatically.
    const Sentry = await import("@sentry/nextjs");
    const init = typeof Sentry?.init === "function" ? Sentry.init : null;
    if (!init) return;

    init({
      dsn,
      enabled: isEnabled,
      environment: getEnv("NEXT_PUBLIC_APP_ENV") || getEnv("NODE_ENV") || "development",
      tracesSampleRate: parseRate(
        getEnv("SENTRY_EDGE_TRACES_SAMPLE_RATE") ?? getEnv("SENTRY_TRACES_SAMPLE_RATE"),
        0.2,
      ),
      profilesSampleRate: parseRate(
        getEnv("SENTRY_EDGE_PROFILES_SAMPLE_RATE") ?? getEnv("SENTRY_PROFILES_SAMPLE_RATE"),
        0.1,
      ),
    });
  } catch (error) {
    logger.warn("sentry_edge_init_skipped", error instanceof Error ? error.message : String(error));
  }
}
