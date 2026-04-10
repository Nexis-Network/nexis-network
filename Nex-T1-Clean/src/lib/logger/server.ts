import pino from 'pino';

/**
 * Server-side logger using pino
 * Structured logging for server components and API routes
 */
const globalLoggerKey = "__nex_server_logger__";

function createLogger() {
  return pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    browser: {
      asObject: false,
    },
    ...(process.env.NODE_ENV === 'development' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    }),
  });
}

type GlobalLoggerStore = typeof globalThis & {
  [globalLoggerKey]?: pino.Logger;
};

const globalStore = globalThis as GlobalLoggerStore;

export const logger = globalStore[globalLoggerKey] ?? createLogger();

if (!globalStore[globalLoggerKey]) {
  globalStore[globalLoggerKey] = logger;
}

export default logger;
