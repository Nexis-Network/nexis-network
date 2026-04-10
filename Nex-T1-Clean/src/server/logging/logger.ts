import pino from "pino";
import type { LevelWithSilent } from "pino";

const STANDARD_LEVELS = new Set([...Object.keys(pino.levels.values), "silent"]);

const resolveLogLevel = (): LevelWithSilent => {
  const raw = process.env.LOG_LEVEL;
  if (!raw) {
    return "info";
  }

  const normalized = raw.trim().toLowerCase();
  if (STANDARD_LEVELS.has(normalized)) {
    return normalized as LevelWithSilent;
  }

  return "info";
};

const logger = pino({
  level: resolveLogLevel(),
});

export const authLogger = logger.child({ domain: "auth" });
export const walletLogger = logger.child({ domain: "wallet" });
export const provisionLogger = logger.child({ domain: "provision" });
export const aiLogger = logger.child({ domain: "ai" });

export default logger;
