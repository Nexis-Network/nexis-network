import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const isEnabled = typeof dsn === "string" && dsn.trim().length > 0;

const parseRate = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const consoleIntegration =
  "captureConsoleIntegration" in Sentry
    ? Sentry.captureConsoleIntegration({ levels: ["log", "warn", "error"] })
    : undefined;
const integrations = consoleIntegration ? [consoleIntegration] : [];

Sentry.init({
  dsn: isEnabled ? dsn : undefined,
  enabled: isEnabled,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
  tracesSampleRate: parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.2),
  profilesSampleRate: parseRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0.2),
  replaysSessionSampleRate: parseRate(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0.0),
  replaysOnErrorSampleRate: parseRate(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 1.0),
  integrations,
  _experiments: {
    enableLogs: true,
  },
});
