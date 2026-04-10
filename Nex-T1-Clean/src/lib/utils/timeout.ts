import { logger } from '@/lib/logger';

export type TimeoutFallbackOptions<T> = {
  timeoutMs?: number;
  scope?: string;
  fallback: () => T | Promise<T>;
  onTimeout?: () => void;
  onError?: (error: UntypedJson) => void;
};

export type TimeoutFallbackResult<T> = {
  value: T;
  timedOut: boolean;
};

// Circuit Breaker Configuration
const CB_FAILURE_THRESHOLD = 5;
const CB_COOLDOWN_MS = 30_000;

type CircuitState = {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
};

const circuitStates = new Map<string, CircuitState>();

function getCircuitState(scope: string): CircuitState {
  let state = circuitStates.get(scope);
  if (!state) {
    state = { failures: 0, lastFailure: 0, isOpen: false };
    circuitStates.set(scope, state);
  }
  return state;
}

function recordSuccess(scope: string) {
  const state = getCircuitState(scope);
  if (state.failures > 0 || state.isOpen) {
    state.failures = 0;
    state.isOpen = false;
    if (process.env.NODE_ENV !== "production") {
      logger.info("circuit_breaker_closed", { scope });
    }
  }
}

function recordFailure(scope: string) {
  const state = getCircuitState(scope);
  state.failures += 1;
  state.lastFailure = Date.now();

  if (state.failures >= CB_FAILURE_THRESHOLD && !state.isOpen) {
    state.isOpen = true;
    logger.warn("circuit_breaker_opened", { scope, failures: state.failures });
  }
}

function isCircuitOpen(scope: string): boolean {
  const state = getCircuitState(scope);
  if (!state.isOpen) return false;

  const now = Date.now();
  if (now - state.lastFailure > CB_COOLDOWN_MS) {
    // Half-open: Allow one request to try and recover
    // We don't change state here, we let the result determine if we close or stay open
    // For simplicity in this utility, we'll just return false to allow the attempt.
    // If it fails again, recordFailure will bump the timestamp and keep it open.
    return false;
  }

  return true;
}

export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  options: TimeoutFallbackOptions<T>,
): Promise<T> {
  const { value } = await withTimeoutFallbackResult(promise, options);
  return value;
}

export function withTimeoutFallbackResult<T>(
  promise: Promise<T>,
  options: TimeoutFallbackOptions<T>,
): Promise<TimeoutFallbackResult<T>> {
  const { timeoutMs, scope, fallback, onTimeout, onError } = options;
  const hasTimeout = Number.isFinite(timeoutMs) && Number(timeoutMs) > 0;

  // Circuit Breaker Check
  if (scope && isCircuitOpen(scope)) {
    if (process.env.NODE_ENV !== "production") {
      logger.warn("circuit_breaker_fast_fail", { scope });
    }
    // Suppress any potential rejection from the original promise to prevent unhandled rejections
    promise.catch(() => {});
    // Fail fast with fallback
    return Promise.resolve(fallback()).then((value) => ({ value, timedOut: true }));
  }

  const handleTimeout = () => {
    if (scope) recordFailure(scope);
    if (onTimeout) {
      onTimeout();
      return;
    }
    if (scope && timeoutMs) {
      logger.warn("timeout_fallback", { scope, timeoutMs });
    }
  };

  const handleError = (error: UntypedJson) => {
    if (scope) recordFailure(scope);
    if (onError) {
      onError(error);
      return;
    }
    if (scope) {
      logger.warn("timeout_scope_error", {
        scope,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSuccess = () => {
    if (scope) recordSuccess(scope);
  };

  const runFallback = (
    timedOut: boolean,
    reject: (reason?: UntypedJson) => void,
    resolve: (result: TimeoutFallbackResult<T>) => void,
  ) => {
    Promise.resolve(fallback())
      .then((value) => {
        resolve({ value, timedOut });
      })
      .catch((fallbackError) => {
        reject(fallbackError);
      });
  };

  if (!hasTimeout) {
    return new Promise<TimeoutFallbackResult<T>>((resolve, reject) => {
      promise
        .then((value) => {
          handleSuccess();
          resolve({ value, timedOut: false });
        })
        .catch((error) => {
          handleError(error);
          runFallback(false, reject, resolve);
        });
    });
  }

  return new Promise<TimeoutFallbackResult<T>>((resolve, reject) => {
    let settled = false;

    const finish = (result: TimeoutFallbackResult<T>) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      handleTimeout();
      runFallback(true, reject, finish);
    }, Number(timeoutMs));

    promise
      .then((value) => {
        handleSuccess();
        finish({ value, timedOut: false });
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        handleError(error);
        runFallback(false, reject, finish);
      });
  });
}
