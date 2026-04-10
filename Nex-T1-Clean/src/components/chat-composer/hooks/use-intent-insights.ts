"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

import type { AgentStrategy } from "@/components/dashboard/chat-config";
import { PROMPTS, type PromptShortcutId } from "@/components/chat-composer/constants";
import { analyzeMarketIntent, type MarketIntentAnalysis } from "@/modules/prices/market-intent";
import { determineRequestTier, type RequestTierDecision } from "@/modules/chat/request-tier";

export type ToolHint = {
  id: string;
  title: string;
  description: string;
  toolName: string;
  actionPrompt: string;
};

export type IntentInsightsResult = {
  normalizedText: string;
  analysis: MarketIntentAnalysis;
  tierDecision: RequestTierDecision | null;
  recommendedTools: ToolHint[];
  isRouting: boolean;
};

const ROUTING_CACHE = new Map<string, { expires: number; decision: RequestTierDecision }>();
const ROUTING_CACHE_TTL = 60_000;
const MAX_ROUTING_CACHE_SIZE = 64;

type ToolHintDefinition = {
  id: string;
  keywords: (RegExp | string)[];
  title: string;
  description: string;
  toolName: string;
  promptId: PromptShortcutId;
};

const PROMPT_LOOKUP = new Map(PROMPTS.map((entry) => [entry.id, entry.prompt]));

const TOOL_HINT_MATRIX: ToolHintDefinition[] = [
  {
    id: "send-eth",
    keywords: [/send/i, /transfer/i, "pay", "treasury"],
    title: "Send 0.1 ETH",
    description: "Populate and broadcast an ETH transfer via cryptowallet_evm.",
    toolName: "cryptowallet_evm",
    promptId: "send-eth",
  },
  {
    id: "buy-eth-uniswap",
    keywords: ["uniswap", /buy\s+eth/i, /swap/i],
    title: "Buy ETH on Uniswap",
    description: "Route swaps through the Uniswap MCP with slip + gas guidance.",
    toolName: "uniswap",
    promptId: "buy-eth-uniswap",
  },
  {
    id: "buy-eth-base",
    keywords: [/0\.?01\s*eth/i, /base/i, /usdc/i],
    title: "Buy 0.01 ETH on Base",
    description: "Use Base RPCs plus Uniswap to fill with USDC liquidity.",
    toolName: "uniswap_base",
    promptId: "buy-eth-base",
  },
  {
    id: "bridge-usdc",
    keywords: [/bridge/i, /base/i, /solana/i, /usdc/i],
    title: "Bridge 50 USDC",
    description: "DeBridge + Wormhole flows to move USDC cross-chain.",
    toolName: "debridge",
    promptId: "bridge-usdc",
  },
  {
    id: "create-evm-wallet",
    keywords: [/evm wallet/i, /new wallet/i, /agent wallet/i],
    title: "New EVM Wallet",
    description: "Generate and store credentials with cryptowallet_evm.",
    toolName: "cryptowallet_evm",
    promptId: "evm-wallet",
  },
  {
    id: "create-sol-wallet",
    keywords: [/solana wallet/i, /sol wallet/i],
    title: "New Solana Wallet",
    description: "Provision a Solana wallet with Helius tools.",
    toolName: "helius_solana",
    promptId: "sol-wallet",
  },
  {
    id: "pumpfun-launch",
    keywords: [/pump.?fun/i, /launch token/i, /deploy token/i],
    title: "Deploy Pump.fun Token",
    description: "Use pumpfun_trader create_and_buy to seed the curve.",
    toolName: "pumpfun_trader",
    promptId: "pumpfun",
  },
];

type IdleHandle = number;
const scheduleIdleWork = (work: () => void): IdleHandle | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const win = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback) => number;
  };

  if (typeof win.requestIdleCallback === "function") {
    return win.requestIdleCallback(work);
  }

  return window.setTimeout(work, 0);
};

const cancelIdleWork = (handle: IdleHandle | null) => {
  if (handle === null || typeof window === "undefined") {
    return;
  }

  const win = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.cancelIdleCallback === "function") {
    win.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

const normalize = (value: string) => value.trim().toLowerCase();

const matchHint = (query: string, hint: ToolHintDefinition): ToolHint | null => {
  if (!query) return null;
  const normalized = normalize(query);
  const found = hint.keywords.some((keyword) =>
    typeof keyword === "string" ? normalized.includes(keyword) : keyword.test(normalized),
  );
  if (!found) return null;
  return {
    id: hint.id,
    title: hint.title,
    description: hint.description,
    toolName: hint.toolName,
    actionPrompt: PROMPT_LOOKUP.get(hint.promptId) ?? "",
  };
};

const pruneRoutingCache = () => {
  if (ROUTING_CACHE.size <= MAX_ROUTING_CACHE_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of ROUTING_CACHE.entries()) {
    if (entry.expires < now) {
      ROUTING_CACHE.delete(key);
    }
  }
  if (ROUTING_CACHE.size <= MAX_ROUTING_CACHE_SIZE) return;
  const oldestKey = ROUTING_CACHE.keys().next().value;
  if (oldestKey) {
    ROUTING_CACHE.delete(oldestKey);
  }
};

export function useIntentInsights(input: string, strategy: AgentStrategy = "auto"): IntentInsightsResult {
  const [debouncedInput] = useDebounce(input, 250);
  const [tierDecision, setTierDecision] = useState<RequestTierDecision | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const latestQueryRef = useRef("");

  const normalizedText = useMemo(() => normalize(debouncedInput), [debouncedInput]);
  const analysis = useMemo(
    () =>
      analyzeMarketIntent(debouncedInput, {
        originalQuery: input,
      }),
    [debouncedInput, input],
  );

  const recommendedTools = useMemo(() => {
    if (!normalizedText) return [];
    const hints: ToolHint[] = [];
    for (const definition of TOOL_HINT_MATRIX) {
      const hint = matchHint(normalizedText, definition);
      if (hint && hint.actionPrompt) {
        hints.push(hint);
      }
    }
    return hints;
  }, [normalizedText]);

  useEffect(() => {
    let idleHandle: IdleHandle | null = null;
    let cancelled = false;

    latestQueryRef.current = normalizedText;
    if (!normalizedText) {
      setTierDecision(null);
      setIsRouting(false);
      return () => {
        cancelled = true;
        cancelIdleWork(idleHandle);
      };
    }

    const cacheKey = `${strategy}:${normalizedText}`;
    const cached = ROUTING_CACHE.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      setTierDecision(cached.decision);
      setIsRouting(false);
      return () => {
        cancelled = true;
        cancelIdleWork(idleHandle);
      };
    }

    const executeRouting = () => {
      if (cancelled) {
        return;
      }
      setIsRouting(true);
      determineRequestTier(normalizedText, {
        skipRemote: true,
        overrideStrategy: strategy,
      })
        .then((decision) => {
          if (cancelled) return;
          ROUTING_CACHE.set(cacheKey, { decision, expires: Date.now() + ROUTING_CACHE_TTL });
          pruneRoutingCache();
          setTierDecision(decision);
        })
        .catch(() => {
          if (!cancelled) {
            setTierDecision(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsRouting(false);
          }
        });
    };

    idleHandle = scheduleIdleWork(executeRouting) ?? null;
    if (idleHandle === null) {
      executeRouting();
    }

    return () => {
      cancelled = true;
      cancelIdleWork(idleHandle);
    };
  }, [normalizedText, strategy]);

  return {
    normalizedText,
    analysis,
    tierDecision,
    recommendedTools,
    isRouting,
  };
}
