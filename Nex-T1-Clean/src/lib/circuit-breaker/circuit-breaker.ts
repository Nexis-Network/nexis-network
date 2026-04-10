import { logger } from '@/lib/logger';

/**
 * Circuit Breaker Pattern Implementation
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 *
 * Features:
 * - Configurable failure thresholds
 * - Exponential backoff for recovery attempts
 * - Metrics collection
 * - Multiple circuit breakers per service
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  recoveryTimeout: number; // Time before attempting recovery (ms)
  monitoringPeriod: number; // Window for failure tracking (ms)
  successThreshold: number; // Successes needed in HALF_OPEN to close
  name: string;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private requests: number = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private nextAttemptTime: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.requests++;

    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError(
          `Circuit breaker OPEN for ${this.config.name}`,
          this.config.name,
          this.state
        );
      }
      // Transition to HALF_OPEN for testing
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(_error: UntypedJson): void {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.consecutiveFailures >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    logger.warn(`Circuit breaker OPENED for ${this.config.name}`);
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    logger.info(`Circuit breaker CLOSED for ${this.config.name}`);
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.nextAttemptTime = 0;
  }

  /**
   * Force circuit breaker open (for maintenance)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public serviceName: string,
    public circuitState: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker Registry - manages multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker for a service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringPeriod: 300000, // 5 minutes
        successThreshold: 3,
        name: serviceName,
        ...config,
      };

      this.breakers.set(serviceName, new CircuitBreaker(defaultConfig));
    }

    return this.breakers.get(serviceName)!;
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Convenience functions
export const getCircuitBreaker = circuitBreakerRegistry.getBreaker.bind(circuitBreakerRegistry);

/**
 * Execute with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName, config);
  return breaker.execute(fn);
}

/**
 * Graceful degradation utilities
 */
export class GracefulDegradation {
  private static fallbacks = new Map<string, () => UntypedJson>();

  /**
   * Register a fallback function for a service
   */
  static registerFallback<T>(serviceName: string, fallback: () => T): void {
    this.fallbacks.set(serviceName, fallback);
  }

  /**
   * Execute with graceful degradation
   */
  static async executeWithFallback<T>(
    serviceName: string,
    primary: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T> {
    try {
      return await withCircuitBreaker(serviceName, primary);
    } catch (error) {
      logger.warn(`Service ${serviceName} failed, using fallback:`, error);

      // Try registered fallback first
      const registeredFallback = this.fallbacks.get(serviceName);
      if (registeredFallback) {
        try {
          return registeredFallback() as T;
        } catch (fallbackError) {
          logger.error(`Fallback for ${serviceName} also failed:`, fallbackError);
        }
      }

      // Use provided fallback value
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      // Re-throw original error
      throw error;
    }
  }
}

/**
 * Service-specific circuit breaker configurations
 */
export const SERVICE_CONFIGS = {
  openai: {
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    successThreshold: 2,
  },
  supabase: {
    failureThreshold: 10,
    recoveryTimeout: 30000, // 30 seconds
    successThreshold: 5,
  },
  redis: {
    failureThreshold: 5,
    recoveryTimeout: 15000, // 15 seconds
    successThreshold: 2,
  },
  mem0: {
    failureThreshold: 3,
    recoveryTimeout: 120000, // 2 minutes (mem0 is optional)
    successThreshold: 1,
  },
} as const;

// Register common fallbacks
GracefulDegradation.registerFallback('mem0', () => null); // Memory features become optional
GracefulDegradation.registerFallback('analytics', () => undefined); // Analytics becomes no-op
