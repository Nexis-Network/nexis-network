import "server-only";

import { MoralisConfigError, MoralisError, moralisRequest } from "./client";
import { createLogger } from "@/server/logging/logging";

const logger = createLogger("moralis-health");
const MORALIS_HEALTH_PROBE_ADDRESS =
  "0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2";

export type MoralisHealthStatus = {
  status: "healthy" | "degraded" | "down";
  lastChecked: string;
  error?: string;
  billingIssue?: boolean;
  rateLimit?: boolean;
  configIssue?: boolean;
};

let cachedStatus: MoralisHealthStatus | null = null;
let lastCheckTime = 0;
let lastLoggedStatusSignature: string | null = null;
const CHECK_INTERVAL_MS = 60_000; // 1 minute

export async function checkMoralisHealth(
  forceRefresh = false,
): Promise<MoralisHealthStatus> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedStatus &&
    now - lastCheckTime < CHECK_INTERVAL_MS
  ) {
    return cachedStatus;
  }

  cachedStatus = await probeMoralisHealth();
  lastCheckTime = now;
  logHealthStatus(cachedStatus);

  return cachedStatus;
}

export async function ensureMoralisHealthy(): Promise<void> {
  const health = await checkMoralisHealth();

  if (health.status === "down" && health.billingIssue) {
    throw new Error(
      "Moralis API is unavailable due to billing issues. " +
        "Please contact support or check https://admin.moralis.io/account/billing",
    );
  }

  if (health.status === "degraded" && health.rateLimit) {
    logger.warn("moralis_rate_limited", { lastChecked: health.lastChecked });
  }
}

async function probeMoralisHealth(): Promise<MoralisHealthStatus> {
  if (!process.env.MORALIS_API_KEY?.trim()) {
    return {
      status: "down",
      lastChecked: new Date().toISOString(),
      error: "MORALIS_API_KEY is not configured",
      configIssue: true,
    };
  }

  try {
    // Probe the token metadata path used by production traffic with a stable public token.
    await moralisRequest({
      api: "evm",
      path: "/erc20/metadata",
      query: {
        chain: "0x1",
        addresses: [MORALIS_HEALTH_PROBE_ADDRESS],
      } as Record<string, UntypedJson>,
      cache: { ttlSeconds: 0 },
    });

    return {
      status: "healthy",
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return mapMoralisHealthError(error);
  }
}

function mapMoralisHealthError(error: unknown): MoralisHealthStatus {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const meta =
    error instanceof MoralisError
      ? (error.meta as Record<string, UntypedJson> | undefined)
      : undefined;
  const detailsStr = JSON.stringify(meta?.details ?? {}).toLowerCase();
  const billingIssue =
    detailsStr.includes("invoice") || detailsStr.includes("billing");
  const rateLimit = meta?.status === 429;
  const configIssue = error instanceof MoralisConfigError;

  return {
    status: billingIssue || configIssue ? "down" : "degraded",
    lastChecked: new Date().toISOString(),
    error: errorMessage,
    billingIssue,
    rateLimit,
    configIssue,
  };
}

function logHealthStatus(status: MoralisHealthStatus): void {
  const signature = JSON.stringify({
    status: status.status,
    error: status.error ?? null,
    billingIssue: status.billingIssue ?? false,
    rateLimit: status.rateLimit ?? false,
    configIssue: status.configIssue ?? false,
  });

  if (signature === lastLoggedStatusSignature) {
    return;
  }

  lastLoggedStatusSignature = signature;

  if (status.status === "healthy") {
    logger.info("moralis_health_check_recovered", {
      lastChecked: status.lastChecked,
    });
    return;
  }

  logger.warn("moralis_health_check_failed", {
    status: status.status,
    billingIssue: status.billingIssue ?? false,
    rateLimit: status.rateLimit ?? false,
    configIssue: status.configIssue ?? false,
    error: status.error ?? "unknown",
  });
}
