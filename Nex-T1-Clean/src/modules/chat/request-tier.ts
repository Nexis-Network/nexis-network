import { analyzeMessageMetadata, type HeuristicRecommendation } from "@/lib/routing-heuristics";
import type { ClassificationComplexity, ClassificationRoute } from "@/lib/routing-classification";
import type { AgentStrategy } from "@/components/dashboard/chat-config";

export type RequestTier = "companion" | "multi-agent";

export type RequestTierDecision = {
  tier: RequestTier;
  route: ClassificationRoute;
  source: "remote" | "heuristic" | "override";
  reason: string;
  heuristics: HeuristicRecommendation;
  remoteIntent?: string | null;
  remoteTeam?: string | null;
  complexity: ClassificationComplexity;
};

type RemotePreviewResponse = {
  intent?: string;
  team?: string;
  route?: string;
  complexity?: string;
  entities?: Record<string, UntypedJson>;
};

const MULTI_AGENT_INTENTS = new Set<string>([
  "research",
  "research_supervisor",
  "trade_evm",
  "trade_solana",
  "tokenomics",
  "smart_contract",
  "trend",
  "sentiment",
  "compliance",
  "ethics",
  "memecoin",
  "staking",
  "liquidity",
  "crosschain",
  "pnl",
  "model_improvement",
]);

const REMOTE_PREVIEW_ENDPOINT = "/api/nex/router/preview";

function inferRouteFromTier(tier: RequestTier, heuristicRoute: ClassificationRoute): ClassificationRoute {
  if (tier === "companion") {
    return "chat";
  }
  if (heuristicRoute === "evaluator_optimizer") {
    return heuristicRoute;
  }
  return "orchestrator";
}

function inferTierFromIntent(intent?: string | null): RequestTier {
  if (!intent) {
    return "companion";
  }
  return MULTI_AGENT_INTENTS.has(intent) ? "multi-agent" : "companion";
}

export async function determineRequestTier(
  input: string,
  options: { skipRemote?: boolean; overrideStrategy?: AgentStrategy; memoryContext?: string | null } = {},
): Promise<RequestTierDecision> {
  const trimmed = input.trim();
  const heuristics = analyzeMessageMetadata(trimmed);
  const skipRemote = options.skipRemote === true;
  const overrideStrategy = options.overrideStrategy;

  if (overrideStrategy === "companion") {
    return {
      tier: "companion",
      route: "chat",
      source: "override",
      reason: "override:companion",
      heuristics,
      remoteIntent: null,
      remoteTeam: null,
      complexity: heuristics.complexity,
    };
  }

  const forcedMulti = overrideStrategy === "multi";

  // Default decision using heuristics only
  const fallbackDecision: RequestTierDecision = {
    tier: forcedMulti
      ? "multi-agent"
      : heuristics.route === "chat"
        ? "companion"
        : "multi-agent",
    route: forcedMulti
      ? heuristics.route === "evaluator_optimizer"
        ? "evaluator_optimizer"
        : "orchestrator"
      : inferRouteFromTier(
          heuristics.route === "chat" ? "companion" : "multi-agent",
          heuristics.route,
        ),
    source: forcedMulti ? "override" : "heuristic",
    reason: forcedMulti ? "override:multi" : `heuristics:${heuristics.category}`,
    heuristics,
    remoteIntent: null,
    remoteTeam: null,
    complexity: heuristics.complexity,
  };

  if (trimmed.length === 0 || skipRemote) {
    return fallbackDecision;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    try {
      const res = await fetch(REMOTE_PREVIEW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          text: trimmed,
          memory: options.memoryContext ?? null,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        return fallbackDecision;
      }

      const payload = (await res.json()) as RemotePreviewResponse;

      let resolvedRoute = (() => {
        const candidate = typeof payload.route === "string" ? payload.route.toLowerCase() : null;
        if (candidate && ["chat", "orchestrator", "evaluator_optimizer"].includes(candidate)) {
          return candidate as ClassificationRoute;
        }
        return inferRouteFromTier(inferTierFromIntent(payload.intent), heuristics.route);
      })();

      let resolvedTier: RequestTier = resolvedRoute === "chat" ? "companion" : "multi-agent";

      const resolvedComplexity: ClassificationComplexity =
        payload.complexity === "complex"
          ? "complex"
          : payload.complexity === "simple"
            ? "simple"
            : heuristics.complexity;

      const reasonParts = [] as string[];
      if (payload.intent) {
        reasonParts.push(`intent:${payload.intent}`);
      }
      if (payload.route) {
        reasonParts.push(`route:${payload.route}`);
      }
      if (payload.complexity) {
        reasonParts.push(`complexity:${payload.complexity}`);
      }

      if (forcedMulti) {
        resolvedTier = "multi-agent";
        if (resolvedRoute === "chat") {
          resolvedRoute =
            heuristics.route === "evaluator_optimizer" ? "evaluator_optimizer" : "orchestrator";
        }
        reasonParts.push("override:multi");
      }

      return {
        tier: resolvedTier,
        route: resolvedRoute,
        source: forcedMulti ? "override" : "remote",
        reason: reasonParts.length ? reasonParts.join("|") : "router:unknown",
        heuristics,
        remoteIntent: payload.intent ?? null,
        remoteTeam: payload.team ?? null,
        complexity: resolvedComplexity,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return fallbackDecision;
  }
}
