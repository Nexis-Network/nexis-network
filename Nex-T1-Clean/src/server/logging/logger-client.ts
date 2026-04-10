/**
 * Structured Logging and Observability System
 *
 * Features:
 * - Structured JSON logging with correlation IDs
 * - Multiple log levels with filtering
 * - Performance metrics collection
 * - Error tracking with context
 * - Distributed tracing support
 */

import pino from 'pino';

export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  value?: number | string;
  metadata?: Record<string, UntypedJson>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface ErrorContext extends LogContext {
  error: Error;
  stack?: string;
  code?: string;
  statusCode?: number;
}

/**
 * Structured Logger with Pino
 */
export class StructuredLogger {
  private logger: pino.Logger;
  private metrics: PerformanceMetric[] = [];

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
        log: (obj) => {
          // Add common fields to all logs
          return {
            ...obj,
            timestamp: new Date().toISOString(),
            service: 'nex-t1',
            version: process.env.npm_package_version || '1.0.0',
          };
        },
      },
      serializers: {
        error: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    });
  }

  /**
   * Create child logger with context
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Log with correlation ID
   */
  withCorrelation(correlationId: string): StructuredLogger {
    return this.child({ correlationId });
  }

  /**
   * Log with user context
   */
  withUser(userId: string, sessionId?: string): StructuredLogger {
    return this.child({ userId, sessionId });
  }

  /**
   * Log with request context
   */
  withRequest(requestId: string, correlationId?: string): StructuredLogger {
    return this.child({ requestId, correlationId });
  }

  /**
   * Structured logging methods
   */
  trace(message: string, context?: LogContext): void {
    this.logger.trace(context || {}, message);
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(context || {}, message);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context || {}, message);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    } : context;

    this.logger.error(errorContext || {}, message);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    } : context;

    this.logger.fatal(errorContext || {}, message);
  }

  /**
   * Performance logging
   */
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation}`, {
      ...context,
      operation,
      duration,
      component: 'performance_monitor',
    });

    // Record metric
    this.recordMetric({
      name: `performance.${operation}`,
      value: duration,
      unit: 'ms',
      tags: context ? this.flattenTags(context) : undefined,
    });
  }

  /**
   * Business metrics logging
   */
  businessMetric(name: string, value: number, context?: LogContext): void {
    const metadata = {
      ...(context?.metadata ?? {}),
      value,
    };

    this.info(`Business Metric: ${name}`, {
      ...context,
      operation: `business_metric_${name}`,
      component: 'business_metrics',
      metadata,
    });

    this.recordMetric({
      name: `business.${name}`,
      value,
      unit: 'count',
      tags: context ? this.flattenTags(context) : undefined,
    });
  }

  /**
   * Security event logging
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;

    this.logger[level]({
      ...context,
      security: true,
      event,
      severity,
    }, `Security Event: ${event}`);
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now(),
    });

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get collected metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Create operation timer
   */
  startTimer(operation: string, context?: LogContext): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, context);
    };
  }

  private flattenTags(context: LogContext): Record<string, string> {
    const tags: Record<string, string> = {};

    if (context.userId) tags.userId = context.userId;
    if (context.component) tags.component = context.component;
    if (context.operation) tags.operation = context.operation;
    if (context.correlationId) tags.correlationId = context.correlationId;

    return tags;
  }
}

// Global logger instance
export const logger = new StructuredLogger();

/**
 * Correlation ID utilities
 */
export class CorrelationManager {
  private static correlationId: string | undefined;

  static generate(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static get(): string {
    if (!this.correlationId) {
      this.correlationId = this.generate();
    }
    return this.correlationId;
  }

  static set(id: string): void {
    this.correlationId = id;
  }

  static clear(): void {
    this.correlationId = undefined;
  }
}

/**
 * Request context middleware for automatic correlation IDs
 */
export function withRequestLogging(requestId?: string): StructuredLogger {
  const correlationId = CorrelationManager.get();
  return logger.withRequest(requestId || correlationId, correlationId);
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static monitors = new Map<string, { count: number; totalTime: number; maxTime: number }>();

  static record(operation: string, duration: number): void {
    const existing = this.monitors.get(operation) || { count: 0, totalTime: 0, maxTime: 0 };

    existing.count++;
    existing.totalTime += duration;
    existing.maxTime = Math.max(existing.maxTime, duration);

    this.monitors.set(operation, existing);
  }

  static getStats(operation: string): { count: number; avgTime: number; maxTime: number } | null {
    const stats = this.monitors.get(operation);
    if (!stats) return null;

    return {
      count: stats.count,
      avgTime: stats.totalTime / stats.count,
      maxTime: stats.maxTime,
    };
  }

  static getAllStats(): Record<string, { count: number; avgTime: number; maxTime: number }> {
    const result: Record<string, { count: number; avgTime: number; maxTime: number }> = {};

    for (const [operation, stats] of this.monitors) {
      result[operation] = {
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        maxTime: stats.maxTime,
      };
    }

    return result;
  }

  static reset(): void {
    this.monitors.clear();
  }
}

/**
 * Error tracking with context
 */
export class ErrorTracker {
  static track(error: Error, context?: ErrorContext): void {
    const errorContext = {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    logger.error('Error tracked', error, errorContext);

    // In production, send to error monitoring service
    // await errorMonitoringService.capture(error, context);
  }

  static trackAsync(error: Error, context?: ErrorContext): void {
    // Fire and forget - don't block on error tracking
    setImmediate(() => this.track(error, context));
  }
}

/**
 * Health check logging
 */
export class HealthLogger {
  static logServiceHealth(serviceName: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: Record<string, UntypedJson>): void {
    const context: LogContext = {
      component: 'health_monitor',
      operation: 'service_health_check',
      metadata: {
        service: serviceName,
        status,
        ...details,
      },
    };

    const message = `Service Health: ${serviceName} is ${status}`;
    if (status === 'unhealthy') {
      logger.error(message, undefined, context);
    } else {
      logger.info(message, context);
    }
  }

  static logDependencyHealth(dependency: string, status: 'up' | 'down' | 'degraded', metrics?: Record<string, number>): void {
    const context: LogContext = {
      component: 'health_monitor',
      operation: 'dependency_health_check',
      metadata: {
        dependency,
        status,
        metrics,
      },
    };

    const message = `Dependency Health: ${dependency} is ${status}`;
    if (status === 'down') {
      logger.error(message, undefined, context);
    } else {
      logger.info(message, context);
    }
  }
}
