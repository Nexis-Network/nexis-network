import { logger } from '@/lib/logger';

/**
 * Centralized logging utility for server-side code.
 * Respects NEX_LOG_LEVEL environment variable (debug|info|warn|error).
 * Provides context-aware logging with structured output.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const CURRENT_LOG_LEVEL: LogLevel = (process.env.NEX_LOG_LEVEL?.toLowerCase() as LogLevel) || "info";
const CURRENT_LOG_LEVEL_VALUE = LOG_LEVELS[CURRENT_LOG_LEVEL] ?? LOG_LEVELS.info;

function safeSerializeMeta(meta: Record<string, UntypedJson>): string {
    const seen = new WeakSet<object>();
    const replacer = (_key: string, value: unknown): unknown => {
        if (typeof value === "bigint") {
            return value.toString();
        }

        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack,
            };
        }

        if (typeof value === "object" && value !== null) {
            if (seen.has(value as object)) {
                return "[Circular]";
            }
            seen.add(value as object);
        }

        return value;
    };

    try {
        return JSON.stringify(meta, replacer);
    } catch {
        return JSON.stringify({ serializationError: "Failed to serialize log metadata." });
    }
}

/**
 * Track warnings that should only be shown once per process lifetime.
 */
const oneTimeWarnings = new Set<string>();

/**
 * Logger for a specific context (e.g., "coinmarketcap", "dextools").
 */
export class Logger {
    constructor(private context: string) { }

    private formatMessage(level: LogLevel, message: string, meta?: Record<string, UntypedJson>): string {
        const prefix = `[${this.context}]`;
        if (meta && Object.keys(meta).length > 0) {
            return `${prefix} ${message} ${safeSerializeMeta(meta)}`;
        }
        return `${prefix} ${message}`;
    }

    private log(level: LogLevel, message: string, meta?: Record<string, UntypedJson>): void {
        if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL_VALUE) {
            return;
        }

        const formatted = this.formatMessage(level, message, meta);

        switch (level) {
            case "debug":
                logger.debug(formatted);
                break;
            case "info":
                logger.info(formatted);
                break;
            case "warn":
                logger.warn(formatted);
                break;
            case "error":
                logger.error(formatted);
                break;
        }
    }

    debug(message: string, meta?: Record<string, UntypedJson>): void {
        this.log("debug", message, meta);
    }

    info(message: string, meta?: Record<string, UntypedJson>): void {
        this.log("info", message, meta);
    }

    warn(message: string, meta?: Record<string, UntypedJson>): void {
        this.log("warn", message, meta);
    }

    error(message: string, meta?: Record<string, UntypedJson>): void {
        this.log("error", message, meta);
    }

    /**
     * Log a warning only once per process lifetime.
     * Useful for startup warnings or recurring expected errors.
     */
    warnOnce(key: string, message: string, meta?: Record<string, UntypedJson>): void {
        const warningKey = `${this.context}:${key}`;
        if (oneTimeWarnings.has(warningKey)) {
            return;
        }
        oneTimeWarnings.add(warningKey);
        this.warn(message, meta);
    }

    /**
     * Log expected errors at debug level (only shown when NEX_LOG_LEVEL=debug).
     * Use this for errors that have fallback mechanisms and don't require attention.
     */
    debugExpectedError(message: string, error?: UntypedJson, meta?: Record<string, UntypedJson>): void {
        const errorMeta = error instanceof Error ? { error: error.message, ...meta } : meta;
        this.debug(message, errorMeta);
    }
}

/**
 * Create a logger for a specific context.
 */
export function createLogger(context: string): Logger {
    return new Logger(context);
}

/**
 * Get the current log level.
 */
export function getLogLevel(): LogLevel {
    return CURRENT_LOG_LEVEL;
}

/**
 * Check if a specific log level is enabled.
 */
export function isLogLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= CURRENT_LOG_LEVEL_VALUE;
}
