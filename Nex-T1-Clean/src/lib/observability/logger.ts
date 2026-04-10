import loggerDefault, { authLogger, walletLogger, provisionLogger } from '@/server/logging/logger';
import type { JsonObject } from "@/types/json";

export const logger = loggerDefault;
export { authLogger, walletLogger, provisionLogger };

// Minimal ErrorTracker shim until full observability module is centralized
export class ErrorTracker {
  static captureException(error: unknown, context?: JsonObject) {
    loggerDefault.error({ error, context }, 'Captured exception');
  }

  static track(event: unknown, context?: JsonObject) {
    const eventLabel = typeof event === 'string' ? event : String(event);
    loggerDefault.info({ event: eventLabel, context }, 'Tracked event');
  }
}

export default loggerDefault;
