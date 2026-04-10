"use client";

import {
  DEFAULT_DISPLAY_PREFERENCES,
  type AssistantPayload,
  type DisplayPreferences,
  type FollowUpSuggestion,
  type FollowUpSuggestionType,
} from "@/components/dashboard/chat-types";
import type { MarketIntentAnalysis } from "@/modules/prices/market-intent";

const MARKET_DATA_PATTERNS = [
  /\bprice(?:s)?\b/,
  /\bpyth\b/,
  /\bchart(?:s)?\b/,
  /\bmarket\s+(?:data|overview)\b/,
  /\bquote(?:s)?\b/,
  /\btvl\b/,
  /\bvolume\b/,
  /\bfunding\b/,
  /\bflows?\b/,
  /\btrading\b/,
  /\bcandlestick(?:s)?\b/,
  /\bperformance\b/,
  /\bon-?chain\b/,
  /\bmetric(?:s)?\b/,
  /\bstat(?:s|istics)\b/,
  /\btrend(?:s)?\b/,
  /\bvolatility\b/,
];

const SOURCE_PATTERNS = [
  /\bsource\b/,
  /\bsources\b/,
  /\bcite\b/,
  /\bcitations?\b/,
  /\breferences?\b/,
  /show\s+(?:me\s+)?the\s+sources/,
  /\blinks?\b/,
  /\burls?\b/,
  /what'?s\s+your\s+source/,
  /where\s+(?:did|does)\s+(?:this|that)\s+(?:come|originate)\s+from/,
  /\bproof\b/,
  /\bevidence\b/,
];

const SEARCH_PATTERNS = [
  /\bsearch\b/,
  /look\s+up/,
  /\bgoogle\b/,
  /\bresearch\b/,
  /find\s+(?:an?|the)?\s*(?:article|information|news|source|sources)/,
];

const NEWS_PATTERNS = [
  /\bnews\b/,
  /\bheadlines?\b/,
  /\blatest\b/,
  /\brecent\b/,
  /\bupdates?\b/,
  /what\s+happened/,
];

const WEB_PREVIEW_PATTERNS = [
  /open\s+(?:the\s+)?(?:link|url|website|web\s*page)/,
  /preview\s+(?:the\s+)?(?:link|website|page)/,
  /show\s+(?:me\s+)?(?:the\s+)?website/,
  /load\s+(?:the\s+)?url/,
  /visit\s+(?:the\s+)?website/,
  /open\s+(?:this|that)\s+site/,
];

const STRUCTURED_DATA_PATTERNS = [
  /\btable\b/,
  /\btabular\b/,
  /\bgrid\b/,
  /\bmatrix\b/,
  /\bcolumns?\b/,
  /\brows?\b/,
  /\bspreadsheet\b/,
  /structured\s+data/,
  /list\s+(?:the\s+)?columns/,
  /format\s+.*\s+as\s+.*\s+table/,
  /turn\s+.*\s+into\s+.*\s+table/,
];

const STRUCTURED_SUGGESTION_PATTERNS = [
  /\bcompare\b/,
  /\bcomparison\b/,
  /\bversus\b/,
  /\bvs\b/,
  /\bcontrast\b/,
  /\bbreakdown\b/,
  /\blist\b/,
  /\btally\b/,
  /\branking\b/,
  /\btop\s+\d+/,
  /\bmetrics?\s+overview\b/,
  /\bperformance\s+review\b/,
];

const matchesAnyPattern = (text: string, patterns: RegExp[]): boolean =>
  patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });

export const ensureDisplayPreferences = (prefs?: DisplayPreferences): DisplayPreferences => ({
  ...DEFAULT_DISPLAY_PREFERENCES,
  ...(prefs ?? {}),
});

const hasActiveSuggestion = (
  suggestions: FollowUpSuggestion[] | undefined,
  type: FollowUpSuggestionType,
  contextKey?: string,
): boolean => {
  if (!suggestions || suggestions.length === 0) {
    return false;
  }

  return suggestions.some((item) => {
    if (item.type !== type) {
      return false;
    }
    if (contextKey && item.context?.url) {
      return item.context.url === contextKey && item.status !== "dismissed";
    }
    return item.status !== "dismissed";
  });
};

const addSuggestion = (
  suggestions: FollowUpSuggestion[] | undefined,
  suggestion: FollowUpSuggestion,
  contextKey?: string,
): FollowUpSuggestion[] => {
  if (hasActiveSuggestion(suggestions, suggestion.type, contextKey)) {
    return suggestions ?? [];
  }
  return [...(suggestions ?? []), suggestion];
};

export const createId = () =>
  typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const deriveDisplayPreferences = (
  query: string,
  intent: MarketIntentAnalysis,
  command?: string | null,
): DisplayPreferences => {
  const normalized = (query ?? "").toLowerCase();
  const commandName = command?.toLowerCase();

  const wantsMarketData =
    intent.shouldShowMarketOverview &&
    (matchesAnyPattern(normalized, MARKET_DATA_PATTERNS) ||
      commandName === "price" ||
      commandName === "market");

  const wantsSources =
    matchesAnyPattern(normalized, SOURCE_PATTERNS) ||
    commandName === "sources" ||
    commandName === "cite";

  const wantsSearchResults =
    matchesAnyPattern(normalized, SEARCH_PATTERNS) || commandName === "search";

  const wantsNews = matchesAnyPattern(normalized, NEWS_PATTERNS) || commandName === "news";

  const wantsWebPreview =
    matchesAnyPattern(normalized, WEB_PREVIEW_PATTERNS) || commandName === "preview";

  const wantsStructured =
    matchesAnyPattern(normalized, STRUCTURED_DATA_PATTERNS) ||
    commandName === "table" ||
    commandName === "summarize";

  return {
    showMarketData: wantsMarketData || wantsNews,
    showSources: wantsSources,
    showSearchResults: wantsSearchResults || wantsNews,
    showWebPreview: wantsWebPreview,
    showStructuredData: wantsStructured,
  };
};

export const deriveFollowUpSuggestions = (
  intent: MarketIntentAnalysis,
  preferences: DisplayPreferences,
  normalizedQuery: string,
  commandName?: string | null,
  options?: {
    artifactPanelOpen?: boolean;
    artifactPanelHasData?: boolean;
  },
): FollowUpSuggestion[] => {
  const normalizedPreferences = ensureDisplayPreferences(preferences);
  const suggestions: FollowUpSuggestion[] = [];

  if (!normalizedPreferences.showMarketData && intent.shouldShowMarketOverview) {
    const tickers =
      intent.tickers.length > 0
        ? intent.tickers
        : intent.assets.map((asset) => `${asset.toUpperCase()}/USD`);
    const label = tickers.length > 0 ? tickers.join(", ") : "this market";
    suggestions.push({
      id: createId(),
      type: "market-data",
      question: `Need a live price chart for ${label}?`,
      confirmLabel: "Yes, generate it",
      declineLabel: "Not now",
      status: "pending",
      context: {
        tickers,
        query: intent.focusQuery,
      },
    });
  }

  const shouldOfferStructured =
    !normalizedPreferences.showStructuredData &&
    matchesAnyPattern(normalizedQuery, STRUCTURED_SUGGESTION_PATTERNS) &&
    commandName !== "summarize";

  if (shouldOfferStructured) {
    suggestions.push({
      id: createId(),
      type: "structured-data",
      question: "Would a structured table help here?",
      confirmLabel: "Yes, craft a table",
      declineLabel: "No thanks",
      status: "pending",
      context: {
        query: intent.focusQuery,
      },
    });
  }

  const shouldOfferArtifactPanel =
    intent.shouldActivateArtifact &&
    !options?.artifactPanelOpen &&
    options?.artifactPanelHasData !== false;

  if (shouldOfferArtifactPanel) {
    suggestions.push({
      id: createId(),
      type: "artifact-panel",
      question: "Open the analytics panel for deeper insights?",
      confirmLabel: "Open panel",
      declineLabel: "Maybe later",
      status: "pending",
      context: {
        query: intent.focusQuery,
      },
    });
  }

  if (
    !normalizedPreferences.showWebPreview &&
    matchesAnyPattern(normalizedQuery, WEB_PREVIEW_PATTERNS)
  ) {
    suggestions.push({
      id: createId(),
      type: "web-preview",
      question: "Want me to open the site inline?",
      confirmLabel: "Open preview",
      declineLabel: "Skip it",
      status: "pending",
    });
  }

  if (
    !normalizedPreferences.showSources &&
    matchesAnyPattern(normalizedQuery, SOURCE_PATTERNS)
  ) {
    suggestions.push({
      id: createId(),
      type: "structured-data",
      question: "Need source citations in the reply?",
      confirmLabel: "Yes, include them",
      declineLabel: "Not needed",
      status: "pending",
    });
  }

  return suggestions;
};

export const filterPayloadsByPreferences = (
  payloads: AssistantPayload[] | undefined,
  preferences: DisplayPreferences,
): AssistantPayload[] => {
  if (!payloads || payloads.length === 0) {
    return [];
  }

  return payloads.filter((payload) => {
    switch (payload.type) {
      case "pyth-chart":
        return preferences.showMarketData;
      case "search":
        return preferences.showSearchResults;
      case "web-preview":
        return preferences.showWebPreview;
      case "analysis":
      case "chain":
        return preferences.showStructuredData;
      default:
        return true;
    }
  });
};

export { addSuggestion };
