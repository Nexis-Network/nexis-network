import { logger } from "@/lib/logger";

import { initBetterStackOtel } from "./otel-sdk";

const parseRate = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

type SentryModule = typeof import("@sentry/nextjs");
type ErrorLog =
  | { error: string }
  | { name: string; message: string; stack?: string };

let sentryPromise: Promise<SentryModule | null> | null = null;
let hasLoggedMissingSentry = false;

const getEnv = (name: string): string | undefined => {
  if (typeof process === "undefined" || !process.env) {
    return undefined;
  }
  return process.env[name];
};

const isModuleNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return (error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND";
};

const toErrorLog = (error: unknown): ErrorLog => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { error: String(error) };
};

const loadSentry = async (): Promise<SentryModule | null> => {
  if (!sentryPromise) {
    sentryPromise = (async () => {
      try {
        return await import("@sentry/nextjs");
      } catch (error) {
        if (isModuleNotFoundError(error)) {
          if (!hasLoggedMissingSentry) {
            hasLoggedMissingSentry = true;
            logger.warn(
              "[observability] Sentry SDK is unavailable for node instrumentation. Continuing without Sentry.",
              toErrorLog(error),
            );
          }
          return null;
        }

        logger.error(
          "[observability] Failed to load Sentry SDK for node instrumentation",
          toErrorLog(error),
        );
        return null;
      }
    })();
  }

  return sentryPromise;
};

const buildSentryConfig = (dsn: string) => ({
  dsn,
  enabled: true,
  environment:
    getEnv("NEXT_PUBLIC_APP_ENV") || getEnv("NODE_ENV") || "development",
  integrations: [],
  tracesSampleRate: parseRate(getEnv("SENTRY_TRACES_SAMPLE_RATE"), 0.2),
  profilesSampleRate: parseRate(getEnv("SENTRY_PROFILES_SAMPLE_RATE"), 0.2),
});

export async function registerNodeInstrumentation(): Promise<void> {
  initBetterStackOtel();

  const dsn = getEnv("SENTRY_DSN") || getEnv("NEXT_PUBLIC_SENTRY_DSN");
  if (!dsn?.trim()) {
    logger.debug("Sentry DSN missing; skipping Sentry initialization");
    return;
  }

  const Sentry = await loadSentry();
  if (!Sentry) {
    return;
  }

  if (typeof Sentry.getClient === "function" && Sentry.getClient()) {
    logger.debug(
      "Sentry client already initialized; skipping node re-initialization",
    );
    return;
  }

  if (typeof Sentry.init !== "function") {
    logger.warn(
      "[observability] Sentry init is unavailable for node instrumentation",
    );
    return;
  }

  try {
    logger.debug(
      `Initializing Sentry for runtime: ${getEnv("NEXT_RUNTIME") || "nodejs"}`,
    );
    Sentry.init(buildSentryConfig(dsn));
  } catch (error) {
    logger.error(
      "[observability] Failed to initialize Sentry",
      toErrorLog(error),
    );
  }
}
