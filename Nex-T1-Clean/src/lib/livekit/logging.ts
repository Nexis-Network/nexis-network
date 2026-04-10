import { getLogger, LoggerNames, type StructuredLogger } from "livekit-client";


import { logger } from '@/lib/logger';
let livekitLoggingConfigured = false;

type NoisyErrorRule = {
  indicator: string;
  replacement: string;
  fallbackLevel: "warn" | "info" | "debug";
};

const NOISY_ERROR_RULES: NoisyErrorRule[] = [
  {
    indicator: "datachannel error on lossy",
    replacement: "LiveKit lossy data channel closed",
    fallbackLevel: "warn",
  },
  {
    indicator: "datachannel error on reliable",
    replacement: "LiveKit reliable data channel closed",
    fallbackLevel: "warn",
  },
  {
    indicator: "websocket is already in closing or closed state",
    replacement: "LiveKit websocket write attempted after close",
    fallbackLevel: "warn",
  },
];

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getNormalizedText = (value: UntypedJson) => {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (value instanceof Error) {
    return value.message.toLowerCase();
  }

  return "";
};

export function configureLivekitLogging() {
  if (livekitLoggingConfigured) {
    return;
  }

  if (typeof window === "undefined") {
    // Only meaningful in the browser where LiveKit runs.
    return;
  }

  try {
    type LoggerWithFactory = StructuredLogger & {
      methodFactory: (
        methodName: string,
        configLevel: number,
        loggerName: string,
      ) => (message: UntypedJson, context?: UntypedJson) => void;
      setLevel: (level: number | string) => void;
      getLevel: () => number;
      info: (...args: UntypedJson[]) => void;
      debug: (...args: UntypedJson[]) => void;
      warn: (...args: UntypedJson[]) => void;
    };

    const uniqueLoggerNames = Array.from(
      new Set<string>([...Object.values(LoggerNames), "livekit"]),
    );

    const targetLoggers: LoggerWithFactory[] = uniqueLoggerNames
      .map((name) => getLogger(name) as LoggerWithFactory)
      // Guards against duplicated loggers in older LiveKit builds.
      .filter((logger, index, self) => self.indexOf(logger) === index);

    const patchLogger = (logger: LoggerWithFactory) => {
      const originalFactory = logger.methodFactory;

      logger.methodFactory = function methodFactory(methodName: string, configLevel: number, loggerName: string) {
        const rawMethod = originalFactory.call(this, methodName, configLevel, loggerName);

        return (message: UntypedJson, context?: UntypedJson) => {
          const textMessage = getNormalizedText(message);
          const matchedRule =
            methodName === "error"
              ? NOISY_ERROR_RULES.find((rule) => textMessage.includes(rule.indicator))
              : undefined;

          if (matchedRule) {
            const fallbackMethod = originalFactory.call(this, matchedRule.fallbackLevel, configLevel, loggerName);
            const pattern = new RegExp(escapeForRegExp(matchedRule.indicator), "i");
            const safeMessage =
              typeof message === "string"
                ? message.replace(pattern, matchedRule.replacement)
                : matchedRule.replacement;

            if (fallbackMethod) {
              if (context !== undefined) {
                fallbackMethod.call(this, safeMessage, context);
              } else {
                fallbackMethod.call(this, safeMessage);
              }
            } else if (process.env.NODE_ENV !== "production") {
              const fallbackConsoleMethod =
                matchedRule.fallbackLevel === "info"
                  ? logger.info
                  : matchedRule.fallbackLevel === "debug"
                    ? logger.debug ?? logger.debug
                    : logger.warn;

              if (context !== undefined) {
                fallbackConsoleMethod.call(console, safeMessage, context);
              } else {
                fallbackConsoleMethod.call(console, safeMessage);
              }
            }
            return;
          }

          if (context !== undefined) {
            rawMethod.call(this, message, context);
            return;
          }

          rawMethod.call(this, message);
        };
      };

      // Rehydrate the custom method factory so loglevel picks it up immediately.
      logger.setLevel(logger.getLevel());
    };

    targetLoggers.forEach(patchLogger);

    livekitLoggingConfigured = true;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("Failed to configure LiveKit logging", error);
    }
  }
}
