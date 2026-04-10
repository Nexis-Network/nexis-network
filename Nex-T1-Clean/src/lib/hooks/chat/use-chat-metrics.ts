/**
 * Chat Metrics Hook
 * Performance tracking and observability for production
 */

import { useCallback, useRef } from "react";
import * as Sentry from "@sentry/nextjs";

import { trackAgentEvent } from "@/modules/analytics/events";


import { logger } from '@/lib/logger';
type MetricType =
  | "message_render"
  | "stream_latency"
  | "cache_hit"
  | "cache_miss"
  | "error"
  | "chat_submission"
  | "chat_market_stream"
  | "chat_followup"
  | "chat_cache"
  | "chat_attachment_preview"
  | "chat_orchestrator"
  | "chat_orchestrator_trace"
  | "chat_event_error";

type PerformanceMark = {
  name: string;
  timestamp: number;
};

export function useChatMetrics() {
  const marksRef = useRef<Map<string, PerformanceMark>>(new Map());
  const rateLimitRef = useRef<Map<string, { count: number; resetAt: number }>>(new Map());

  const allowEvent = useCallback((key: string, limit = 30, windowMs = 60_000) => {
    const now = Date.now();
    const bucket = rateLimitRef.current.get(key);
    if (!bucket || bucket.resetAt < now) {
      rateLimitRef.current.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count >= limit) {
      return false;
    }
    bucket.count += 1;
    return true;
  }, []);

  const mark = useCallback((name: string) => {
    marksRef.current.set(name, {
      name,
      timestamp: performance.now(),
    });

    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(name);
    }
  }, []);

  const measure = useCallback((name: string, startMark: string, endMark?: string) => {
    const start = marksRef.current.get(startMark);
    const end = endMark ? marksRef.current.get(endMark) : { timestamp: performance.now() };

    if (!start || !end) {
      logger.warn(`[Metrics] Missing marks for ${name}`);
      return 0;
    }

    const duration = end.timestamp - start.timestamp;

    if (typeof performance !== "undefined" && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch {
        // Ignore if marks don't exist in Performance API
      }
    }

    // Log in development
    if (process.env.NODE_ENV === "development") {
      logger.debug(`[Metrics] ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }, []);

  const trackEvent = useCallback(
    (event: MetricType, metadata?: Record<string, UntypedJson>) => {
      if (!allowEvent(`metric:${event}`)) return;

      if (process.env.NODE_ENV === "development") {
        logger.debug(`[Event] ${event}`, metadata);
      }

      try {
        Sentry.addBreadcrumb({
          category: "chat-metric",
          message: event,
          data: metadata,
          level: "info",
        });
      } catch {
        // ignore breadcrumb failures
      }

      trackAgentEvent(event, metadata);
    },
    [allowEvent],
  );

  const trackCacheHit = useCallback((key: string) => {
    trackEvent("cache_hit", { key });
  }, [trackEvent]);

  const trackCacheMiss = useCallback((key: string) => {
    trackEvent("cache_miss", { key });
  }, [trackEvent]);

  const trackError = useCallback((error: Error, context?: Record<string, UntypedJson>) => {
    const errorMetadata = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    };

    if (!allowEvent("metric:error", 20, 60_000)) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      logger.error(`[Error] ${error.name}: ${error.message}`, {
        ...errorMetadata,
        error,
      });
    }

    trackEvent("error", errorMetadata);

    try {
      Sentry.captureException(error, {
        tags: { area: "chat" },
        extra: errorMetadata,
      });
    } catch {
      // swallow Sentry failures silently
    }
  }, [allowEvent, trackEvent]);

  return {
    mark,
    measure,
    trackEvent,
    trackCacheHit,
    trackCacheMiss,
    trackError,
  };
}
