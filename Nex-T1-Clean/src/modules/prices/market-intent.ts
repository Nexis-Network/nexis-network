const DEFAULT_CRYPTO_INTENT_KEYWORDS = [
  "usdt",
  "dex",
  "token",
  "liquidity",
  "memecoin",
  "defi",
  "crypto",
  "pair",
  "on-chain",
] as const;

const FINANCE_KEYWORD_PATTERN =
  /(financial|revenue|expenses|cash flow|runway|balance sheet|burn rate)/;

const STOCK_KEYWORD_PATTERN = /(stock|nasdaq|nyse|ticker|share|price)/;

const STOCK_TICKER_PATTERN = /\b[a-z]{1,5}\b/;

const MARKET_ANALYSIS_PATTERN =
  /\b(analysis|metrics?|data|sentiment|price|prices|volume|tvl|funding|flows|liquidity|chart|charts|quote|quotes|candlestick|trend|performance|stats?|statistics|on-?chain|trading|volatility)\b/;

export const ASSET_KEYWORD_MAP = Object.freeze({
  eth: ["eth", "ethereum"],
  btc: ["btc", "bitcoin"],
  sol: ["sol", "solana"],
  arb: ["arb", "arbitrum"],
  matic: ["matic", "polygon"],
  avax: ["avax", "avalanche"],
  link: ["link", "chainlink"],
  uni: ["uni", "uniswap"],
  aave: ["aave"],
  op: ["op", "optimism"],
} as const);

export type AssetSlug = keyof typeof ASSET_KEYWORD_MAP;

const FLATTENED_ASSET_KEYWORDS = Object.freeze(Object.values(ASSET_KEYWORD_MAP).flat());

const CRYPTO_INTENT_KEYWORDS = Object.freeze(
  new Set([...FLATTENED_ASSET_KEYWORDS, ...DEFAULT_CRYPTO_INTENT_KEYWORDS])
);

export const MARKET_PRIMARY_KEYWORDS = Object.freeze([
  "market overview",
  "market data",
  "cross-chain",
  "defi flows",
  "total value locked",
  "tvl",
  "funding rate",
  "sentiment",
  "whale activity",
  "on-chain metrics",
  "messari",
  "santiment",
  "token metrics",
  "liquidity rotation",
] as const);

type KeywordMap = Record<string, readonly string[]>;

const normalizeQuery = (query: UntypedJson): string => {
  if (typeof query === "string") {
    return query.toLowerCase().trim();
  }

  if (typeof query === "number" || typeof query === "boolean") {
    return String(query).toLowerCase().trim();
  }

  if (Array.isArray(query)) {
    return query
      .map((item) => normalizeQuery(item))
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if (query && typeof query === "object") {
    const { query: nestedQuery, text, value, label } = query as Record<string, UntypedJson>;
    const candidate = nestedQuery ?? text ?? value ?? label;
    if (candidate !== undefined) {
      return normalizeQuery(candidate);
    }

    const stringValue = (query as { toString?: () => string }).toString?.();
    if (stringValue && stringValue !== "[object Object]") {
      return stringValue.toLowerCase().trim();
    }
  }

  return "";
};

const containsKeyword = (text: string, keywords: Iterable<string>): boolean => {
  for (const keyword of keywords) {
    if (keyword && text.includes(keyword)) {
      return true;
    }
  }
  return false;
};

const collectAssetMatches = (text: string, keywordMap: KeywordMap): Set<string> => {
  const matches = new Set<string>();
  for (const [slug, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      matches.add(slug);
    }
  }
  return matches;
};

export const extractAssetsFromQuery = (
  query: string | null | undefined,
  keywordMap: KeywordMap = ASSET_KEYWORD_MAP
): string[] => {
  const text = normalizeQuery(query);
  return Array.from(collectAssetMatches(text, keywordMap));
};

export const extractPythTickers = (
  query: string | null | undefined,
  keywordMap: KeywordMap = ASSET_KEYWORD_MAP
): string[] => {
  const matches = new Set<string>();
  const text = query ?? "";
  const lowered = text.toLowerCase();
  const mentionsMarketMetric = MARKET_ANALYSIS_PATTERN.test(lowered);

  const pairPattern = /\b([A-Za-z0-9]{2,10})\/(USD)\b/gi;
  let pairMatch: RegExpExecArray | null;
  while ((pairMatch = pairPattern.exec(text)) !== null) {
    const base = pairMatch[1]?.toUpperCase();
    const quote = pairMatch[2]?.toUpperCase();
    if (!base || quote !== "USD") continue;
    matches.add(`${base}/${quote}`);
  }

  for (const [slug, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((keyword) => lowered.includes(keyword))) {
      matches.add(`${slug.toUpperCase()}/USD`);
    }
  }

  if (mentionsMarketMetric) {
    const stopTickers = new Set([
      "USD",
      "USDT",
      "USDC",
      "TVL",
      "DEX",
      "NFT",
      "API",
      "MCP",
      "AI",
      "DAO",
      "APR",
      "APY",
      "ATH",
      "ATL",
    ]);

    const addTicker = (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const symbol = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (symbol.length < 2 || symbol.length > 10) return;
      if (stopTickers.has(symbol)) return;
      matches.add(`${symbol}/USD`);
    };

    // $BTC style
    const dollarPattern = /\$([A-Za-z0-9]{2,10})\b/g;
    let dollarMatch: RegExpExecArray | null;
    while ((dollarMatch = dollarPattern.exec(text)) !== null) {
      addTicker(dollarMatch[1] ?? "");
    }

    // Standalone uppercase tickers (ETH, SOL, DOGE) in market contexts.
    const upperPattern = /\b([A-Z]{2,10})\b/g;
    let upperMatch: RegExpExecArray | null;
    while ((upperMatch = upperPattern.exec(text)) !== null) {
      addTicker(upperMatch[1] ?? "");
    }
  }

  return Array.from(matches);
};

export const matchesPrimaryMarketKeyword = (
  query: string | null | undefined,
  primaryKeywords: readonly string[] = MARKET_PRIMARY_KEYWORDS
): boolean => {
  const text = normalizeQuery(query);
  return primaryKeywords.some((keyword) => text.includes(keyword));
};

export type MarketIntentMode = "general" | "crypto" | "stock" | "financial";

export const detectMarketMode = (query: string | null | undefined): MarketIntentMode => {
  const text = normalizeQuery(query);
  if (!text) {
    return "general";
  }

  if (containsKeyword(text, CRYPTO_INTENT_KEYWORDS)) {
    return "crypto";
  }

  if (STOCK_TICKER_PATTERN.test(text) && STOCK_KEYWORD_PATTERN.test(text)) {
    return "stock";
  }

  if (FINANCE_KEYWORD_PATTERN.test(text)) {
    return "financial";
  }

  return "general";
};

export const shouldActivateArtifact = (query: string | null | undefined): boolean => {
  return detectMarketMode(query) !== "general";
};

export type MarketIntentConfidence = "low" | "medium" | "high";

export type MarketIntentAnalysis = {
  originalQuery: string;
  focusQuery: string;
  normalizedQuery: string;
  mode: MarketIntentMode;
  assets: string[];
  tickers: string[];
  hasPrimaryKeyword: boolean;
  hasArtifactIntent: boolean;
  hasMarketPatternContext: boolean;
  confidence: MarketIntentConfidence;
  shouldActivateArtifact: boolean;
  shouldShowMarketOverview: boolean;
};

type MarketIntentOptions = {
  keywordMap?: KeywordMap;
  primaryKeywords?: readonly string[];
  originalQuery?: string | null | undefined;
};

export const analyzeMarketIntent = (
  query: string | null | undefined,
  options?: MarketIntentOptions
): MarketIntentAnalysis => {
  const keywordMap = options?.keywordMap ?? ASSET_KEYWORD_MAP;
  const primaryKeywords = options?.primaryKeywords ?? MARKET_PRIMARY_KEYWORDS;
  const focusQueryRaw = query ?? "";
  const focusQuery =
    typeof focusQueryRaw === "string" ? focusQueryRaw.trim() : normalizeQuery(focusQueryRaw);
  const originalQueryCandidate = options?.originalQuery ?? focusQueryRaw;
  const originalQuery =
    typeof originalQueryCandidate === "string"
      ? originalQueryCandidate
      : normalizeQuery(originalQueryCandidate);
  const normalizedQuery = normalizeQuery(focusQuery);
  const mode = detectMarketMode(focusQuery);
  const assets = extractAssetsFromQuery(focusQuery, keywordMap);
  const tickers = extractPythTickers(focusQuery, keywordMap);
  const hasPrimaryKeyword = matchesPrimaryMarketKeyword(focusQuery, primaryKeywords);
  const hasArtifactIntent = mode !== "general";
  const mentionsMarketMetric = MARKET_ANALYSIS_PATTERN.test(normalizedQuery);
  const hasMarketPatternContext = assets.length > 0 && mentionsMarketMetric;
  const hasTickerMetricContext = tickers.length > 0 && mentionsMarketMetric;

  const signals = [
    hasPrimaryKeyword,
    hasArtifactIntent,
    hasMarketPatternContext,
    tickers.length > 0,
  ].filter(Boolean).length;

  let confidence: MarketIntentConfidence = "low";
  if (signals >= 3) {
    confidence = "high";
  } else if (signals >= 2) {
    confidence = "medium";
  } else if (signals === 1 && hasArtifactIntent) {
    confidence = "medium";
  }

  const shouldShowMarketOverview =
    hasPrimaryKeyword || hasMarketPatternContext || hasTickerMetricContext;

  return {
    originalQuery,
    focusQuery,
    normalizedQuery,
    mode,
    assets,
    tickers,
    hasPrimaryKeyword,
    hasArtifactIntent,
    hasMarketPatternContext,
    confidence,
    shouldActivateArtifact: hasArtifactIntent,
    shouldShowMarketOverview,
  };
};

export const shouldShowMarketOverview = (
  query: string | null | undefined,
  options?: MarketIntentOptions
): boolean => {
  return analyzeMarketIntent(query, options).shouldShowMarketOverview;
};

export const buildAssetKeywordIndex = (
  keywordMap: KeywordMap = ASSET_KEYWORD_MAP
): Map<string, string> => {
  const index = new Map<string, string>();
  for (const [slug, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      index.set(keyword, slug);
    }
  }
  return index;
};
