// Domain: wallets (Safe)
// Responsibility: Provisioning retry/backoff decisions for Safe wallet accounts.
// Depends on: none
// Notes: Keep deterministic by injecting RNG where needed.

export type SafeProvisionStatus = "pending" | "provisioning" | "ready" | "failed" | "retry_scheduled" | "dead";

export type RetryDecision =
  | { action: "skip"; reason: string }
  | { action: "attempt" }
  | { action: "dead_letter"; reason: string };

export function shouldAttemptProvisioning(params: {
  status: SafeProvisionStatus;
  nextAttemptAt: Date | null;
  attemptCount: number;
  maxAttempts: number;
  now: Date;
}): RetryDecision {
  const { status, nextAttemptAt, attemptCount, maxAttempts, now } = params;

  if (status === "ready") {
    return { action: "skip", reason: "already_ready" };
  }

  if (status === "dead") {
    return { action: "skip", reason: "dead_lettered" };
  }

  if (attemptCount >= maxAttempts) {
    return { action: "dead_letter", reason: "max_attempts_exceeded" };
  }

  if (status === "retry_scheduled" && nextAttemptAt && nextAttemptAt.getTime() > now.getTime()) {
    return { action: "skip", reason: "retry_not_due" };
  }

  return { action: "attempt" };
}

export function computeBackoffSeconds(params: {
  attemptNumber: number;
  baseSeconds: number;
  maxSeconds: number;
  jitterRatio: number;
  random: () => number;
}): number {
  const { attemptNumber, baseSeconds, maxSeconds, jitterRatio, random } = params;

  const attempt = Math.max(1, Math.trunc(attemptNumber));
  const exponential = baseSeconds * Math.pow(2, attempt - 1);
  const capped = Math.min(maxSeconds, exponential);

  const jitter = Math.max(0, Math.min(1, jitterRatio));
  const r = Math.max(0, Math.min(1, random()));
  const delta = capped * jitter;

  // Full jitter around capped: [capped - delta, capped + delta]
  const withJitter = capped - delta + (2 * delta * r);
  return Math.max(1, Math.round(withJitter));
}

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + Math.max(0, Math.trunc(seconds)) * 1000);
}
