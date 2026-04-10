import {
  ensureDisplayPreferences,
} from "@/components/dashboard/chat-intent";
import type {
  AssistantPayload,
  DisplayPreferences,
} from "@/components/dashboard/chat-types";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";
import type { Source } from "@/lib/schema";

export const mergePayloads = (
  existing: AssistantPayload[] | undefined,
  additions: AssistantPayload[],
): AssistantPayload[] => {
  if (!additions.length) {
    return existing ?? [];
  }

  if (!existing || existing.length === 0) {
    return additions;
  }

  const keyFor = (payload: AssistantPayload) => {
    switch (payload.type) {
      case "analysis":
        return `analysis-${payload.topic}`;
      case "chain":
        return `chain-${payload.topic}`;
      case "search":
        return `search-${payload.query}`;
      case "web-preview":
        return `web-preview-${payload.url}`;
      case "pyth-chart":
        return `pyth-chart-${payload.ticker.toLowerCase()}`;
      case "coingecko-chart":
        return `coingecko-chart-${payload.id.toLowerCase()}`;
      case "nft-chart":
        return `nft-chart-${payload.id.toLowerCase()}`;
      default:
        return ((payload as { type?: string }).type) ?? "unknown";
    }
  };

  const seen = new Set(existing.map(keyFor));
  const merged = [...existing];

  for (const addition of additions) {
    const key = keyFor(addition);
    if (!seen.has(key)) {
      merged.push(addition);
      seen.add(key);
    }
  }

  return merged;
};

export const createSourcePayloads = (
  sources: Source[],
  query: string | undefined,
  preferences: DisplayPreferences | undefined,
): AssistantPayload[] => {
  if (!sources.length) {
    return [];
  }

  const prefs = ensureDisplayPreferences(preferences);
  const payloads: AssistantPayload[] = [];

  if (prefs.showSearchResults) {
    const markdown = sources
      .map((source, index) => {
        const label = source.title || source.url;
        const snippet = source.snippet ? ` — ${source.snippet}` : "";
        return `${index + 1}. [${label}](${source.url})${snippet}`;
      })
      .join("\n");

    payloads.push({
      type: "search",
      query: query ?? "Related sources",
      data: {
        text: markdown,
        sources,
      },
    });
  }

  if (prefs.showWebPreview && sources.length > 0) {
    const primary = sources[0];
    payloads.push({
      type: "web-preview",
      url: primary.url,
      title: primary.title,
    });
  }

  return payloads;
};

export const buildFollowUpQuestions = (
  query: string | undefined,
  intent: MarketIntentAnalysis | undefined,
  sources: Source[],
): string[] => {
  const normalizedQuery = (query ?? intent?.focusQuery ?? intent?.normalizedQuery ?? "").trim();
  const topic = normalizedQuery.length > 0 ? normalizedQuery : "this topic";
  const primarySource = sources[0];
  let primaryHost: string | undefined;
  if (primarySource) {
    try {
      primaryHost = new URL(primarySource.url).hostname.replace(/^www\./, "");
    } catch {
      primaryHost = undefined;
    }
  }

  const prompts = [
    `What risks or pitfalls should I monitor around ${topic}?`,
    `Turn ${topic} into an actionable plan with concrete next steps.`,
    `Which on-chain or market indicators give early signals about ${topic}?`,
  ];

  if (primaryHost) {
    prompts.push(`Does ${primaryHost} highlight any emerging trends related to ${topic}?`);
  }

  return Array.from(new Set(prompts)).slice(0, 3);
};
