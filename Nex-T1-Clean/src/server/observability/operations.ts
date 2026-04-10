import "server-only";

import { logger } from "@/lib/logger";
import type { JsonObject } from "@/types/json";
import { metrics } from "@/server/instrumentation/metrics";

type ObservedOperationOptions = {
  domain: string;
  operation: string;
  budgetMs?: number;
  context?: JsonObject;
  logSuccess?: boolean;
};

function formatOperationLabel(options: ObservedOperationOptions, suffix: "failed" | "over_budget" | "completed") {
  return `[${options.domain}] ${options.operation} ${suffix}`;
}

export async function observeServerOperation<T>(
  options: ObservedOperationOptions,
  execute: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await execute();
    const durationMs = Date.now() - startedAt;
    metrics.operation(options.domain, options.operation, "ok");
    metrics.operationDuration(options.domain, options.operation, durationMs);

    if (options.budgetMs && durationMs > options.budgetMs) {
      logger.warn(
        {
          ...options.context,
          domain: options.domain,
          operation: options.operation,
          durationMs,
          budgetMs: options.budgetMs,
        },
        formatOperationLabel(options, "over_budget"),
      );
    } else if (options.logSuccess) {
      logger.info(
        {
          ...options.context,
          domain: options.domain,
          operation: options.operation,
          durationMs,
        },
        formatOperationLabel(options, "completed"),
      );
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    metrics.operation(options.domain, options.operation, "error");
    metrics.operationDuration(options.domain, options.operation, durationMs);
    logger.error(
      {
        ...options.context,
        domain: options.domain,
        operation: options.operation,
        durationMs,
        budgetMs: options.budgetMs ?? null,
        error,
      },
      formatOperationLabel(options, "failed"),
    );
    throw error;
  }
}
