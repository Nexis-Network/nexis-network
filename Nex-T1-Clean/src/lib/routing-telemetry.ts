import crypto from "crypto";
import type {
  ClassificationCategory,
  ClassificationModelTier,
  ClassificationRoute,
} from "./routing-classification";
import type { HeuristicSignals } from "./routing-heuristics";


import { logger } from '@/lib/logger';
type TelemetryConfig = {
  endpoint: string;
  apiKey?: string;
};

const TELEMETRY_ENDPOINT = process.env.NEX_ROUTING_TELEMETRY_ENDPOINT;
const TELEMETRY_API_KEY = process.env.NEX_ROUTING_TELEMETRY_KEY;

export type RoutingTelemetryPayload = {
  timestamp: string;
  strategy: "heuristic" | "hybrid";
  category: ClassificationCategory;
  route: ClassificationRoute;
  modelTier: ClassificationModelTier;
  confidence: number;
  heuristicsConfidence: number;
  llmConfidence?: number;
  complexity: "simple" | "complex";
  durationMs: number;
  tokenEstimate?: {
    inputTokens: number;
  };
  heuristics: {
    signals: HeuristicSignals;
  };
  inputSummary: {
    charCount: number;
    wordCount: number;
    sha256: string;
  };
};

function hashInput(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getTelemetryConfig(): TelemetryConfig | undefined {
  if (!TELEMETRY_ENDPOINT) {
    return undefined;
  }
  return {
    endpoint: TELEMETRY_ENDPOINT,
    apiKey: TELEMETRY_API_KEY,
  };
}

export async function recordRoutingTelemetry(payload: RoutingTelemetryPayload) {
  const config = getTelemetryConfig();

  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      logger.debug("[routing-telemetry] payload", payload);
    }
    return;
  }

  try {
    await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.error("[routing-telemetry] failed to send telemetry", error);
    }
  }
}

export function buildTelemetryPayload(options: {
  strategy: "heuristic" | "hybrid";
  category: ClassificationCategory;
  route: ClassificationRoute;
  modelTier: ClassificationModelTier;
  confidence: number;
  heuristicsConfidence: number;
  llmConfidence?: number;
  complexity: "simple" | "complex";
  input: string;
  durationMs: number;
  heuristicsSignals: HeuristicSignals;
  tokenEstimate?: {
    inputTokens: number;
  };
}): RoutingTelemetryPayload {
  return {
    timestamp: new Date().toISOString(),
    strategy: options.strategy,
    category: options.category,
    route: options.route,
    modelTier: options.modelTier,
    confidence: Number(options.confidence.toFixed(2)),
    heuristicsConfidence: Number(options.heuristicsConfidence.toFixed(2)),
    llmConfidence:
      options.llmConfidence !== undefined
        ? Number(options.llmConfidence.toFixed(2))
        : undefined,
    complexity: options.complexity,
    durationMs: options.durationMs,
    tokenEstimate: options.tokenEstimate,
    heuristics: {
      signals: options.heuristicsSignals,
    },
    inputSummary: {
      charCount: options.input.length,
      wordCount: options.input.trim() ? options.input.trim().split(/\s+/).length : 0,
      sha256: hashInput(options.input),
    },
  };
}
