import type {
  ClassificationCategory,
  ClassificationComplexity,
  ClassificationModelTier,
  ClassificationRoute,
} from "./routing-classification";
import { type CategoryPolicy, type CategorySuperGroup, getCategoryPolicy } from "./routing-policy";

export type HeuristicSignals = {
  wordCount: number;
  charCount: number;
  containsCode: boolean;
  containsUrls: boolean;
  containsWalletAddress: boolean;
  containsNumbers: boolean;
  matchedKeywords: string[];
  superGroup?: CategorySuperGroup;
};

export type HeuristicRecommendation = {
  category: ClassificationCategory;
  route: ClassificationRoute;
  tier: ClassificationModelTier;
  complexity: ClassificationComplexity;
  confidence: number;
  signals: HeuristicSignals;
};

const KEYWORD_CATEGORY_OVERRIDES: Array<{
  category: ClassificationCategory;
  patterns: RegExp[];
  superGroup?: CategorySuperGroup;
}> = [
  {
    category: "crypto_solidity",
    superGroup: "developer",
    patterns: [
      /\bsolidity\b/i,
      /\bpragma solidity\b/i,
      /\bsmart contract\b/i,
      /\bsolc\b/i,
    ],
  },
  {
    category: "crypto_rust",
    superGroup: "developer",
    patterns: [/\brust\b/i, /\banchor framework\b/i, /\bsolana program\b/i],
  },
  {
    category: "smart_contract_development",
    superGroup: "developer",
    patterns: [
      /\bdeploy\b.*\bcontract\b/i,
      /\bsmart[-\s]?contract\b/i,
      /\berc\d{2}\b/i,
    ],
  },
  {
    category: "crypto_trading",
    superGroup: "trading",
    patterns: [
      /\blong\b/i,
      /\bshort\b/i,
      /\bentry\b/i,
      /\bexit\b/i,
      /\bPnL\b/i,
      /\bperp(s)?\b/i,
      /\bfutures\b/i,
    ],
  },
  {
    category: "crypto_investing",
    superGroup: "investing",
    patterns: [
      /\binvest\b/i,
      /\bportfolio\b/i,
      /\ballocate\b/i,
      /\bhold\b/i,
      /\bdca\b/i,
    ],
  },
  {
    category: "market_analysis",
    superGroup: "analyst",
    patterns: [
      /\banaly(s|z)e\b/i,
      /\bpattern\b/i,
      /\bindicator\b/i,
      /\btechnical analysis\b/i,
      /\bon-chain\b/i,
    ],
  },
  {
    category: "market_research",
    superGroup: "market_research",
    patterns: [/\bresearch\b/i, /\breport\b/i, /\bcomparative\b/i],
  },
  {
    category: "blockchain_support",
    superGroup: "blockchain_support",
    patterns: [/\bw(eb)?3\b/i, /\bwallet\b/i, /\bbridge\b/i, /\bgas fee\b/i],
  },
  {
    category: "defi_support",
    superGroup: "blockchain_support",
    patterns: [
      /\bdefi\b/i,
      /\byield\b/i,
      /\bliquidity\b/i,
      /\bstaking\b/i,
      /\bfarming\b/i,
    ],
  },
  {
    category: "life_support",
    superGroup: "life_support",
    patterns: [
      /\bfeeling\b/i,
      /\bstressed\b/i,
      /\banxious\b/i,
      /\brelationship\b/i,
      /\bmental health\b/i,
    ],
  },
  {
    category: "general_support",
    superGroup: "support",
    patterns: [/\bsupport\b/i, /\bhelp\b/i, /\bassistance\b/i],
  },
  {
    category: "technical_support",
    superGroup: "technical",
    patterns: [
      /\bdebug\b/i,
      /\berror\b/i,
      /\bstack trace\b/i,
      /\bapi\b/i,
      /\b503\b/,
    ],
  },
];

const SUPER_GROUP_FALLBACK_CATEGORY: Record<CategorySuperGroup, ClassificationCategory> = {
  general: "general_chat",
  support: "general_support",
  life_support: "life_support",
  product: "product_support",
  technical: "technical_support",
  blockchain_support: "blockchain_support",
  trading: "crypto_trading",
  investing: "crypto_investing",
  research: "crypto_research",
  developer: "smart_contract_development",
  analyst: "market_analysis",
  strategist: "evm_chain_strategist",
  market_research: "market_research",
  other: "other",
};

const SUPER_GROUP_HINTS: Array<{ superGroup: CategorySuperGroup; patterns: RegExp[] }> = [
  {
    superGroup: "developer",
    patterns: [/\bcode\b/i, /```/, /\bcompile\b/i, /\bdeploy\b/i],
  },
  {
    superGroup: "trading",
    patterns: [/\btrade\b/i, /\bPnL\b/i, /\blong\b/i, /\bshort\b/i],
  },
  {
    superGroup: "investing",
    patterns: [/\binvest\b/i, /\bportfolio\b/i, /\bhodl\b/i],
  },
  {
    superGroup: "research",
    patterns: [/\bresearch\b/i, /\banaly(s|z)e\b/i, /\bwhitepaper\b/i],
  },
  {
    superGroup: "blockchain_support",
    patterns: [/\bw(eb)?3\b/i, /\bwallet\b/i, /\bbridge\b/i],
  },
  {
    superGroup: "analyst",
    patterns: [/\bchart\b/i, /\bindicator\b/i, /\bmetrics\b/i],
  },
  {
    superGroup: "life_support",
    patterns: [/\bstress\b/i, /\banxious\b/i, /\brelationship\b/i],
  },
  {
    superGroup: "technical",
    patterns: [/\bbug\b/i, /\berror\b/i, /\bstack\b/i, /\bexception\b/i],
  },
];

const WALLET_REGEX = /\b0x[a-fA-F0-9]{40}\b/;

function detectSuperGroup(input: string, lowerInput: string) {
  const matchedGroups = new Map<CategorySuperGroup, number>();

  for (const { superGroup, patterns } of SUPER_GROUP_HINTS) {
    for (const pattern of patterns) {
      if (pattern.test(input)) {
        matchedGroups.set(superGroup, (matchedGroups.get(superGroup) ?? 0) + 1);
      }
    }
  }

  for (const { patterns } of SUPER_GROUP_HINTS) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
    }
  }

  // Priority heuristics: developer if code fences present
  if (lowerInput.includes("```")) {
    matchedGroups.set("developer", (matchedGroups.get("developer") ?? 0) + 2);
  }

  if (matchedGroups.size === 0) {
    return undefined;
  }

  let topGroup: CategorySuperGroup | undefined;
  let score = -Infinity;

  for (const [group, value] of matchedGroups.entries()) {
    if (value > score) {
      score = value;
      topGroup = group;
    }
  }

  return topGroup;
}

function chooseCategory(
  input: string,
  lowerInput: string,
  superGroupHint?: CategorySuperGroup
): {
  category: ClassificationCategory;
  matchedKeywords: string[];
  superGroup?: CategorySuperGroup;
} {
  const matchedKeywords: string[] = [];

  for (const matcher of KEYWORD_CATEGORY_OVERRIDES) {
    for (const pattern of matcher.patterns) {
      if (pattern.test(input)) {
        matchedKeywords.push(pattern.toString());
        return {
          category: matcher.category,
          matchedKeywords,
          superGroup: matcher.superGroup ?? superGroupHint,
        };
      }
      pattern.lastIndex = 0;
    }
  }

  if (superGroupHint) {
    const fallback = SUPER_GROUP_FALLBACK_CATEGORY[superGroupHint];
    return { category: fallback, matchedKeywords, superGroup: superGroupHint };
  }

  // last resort: default general chat unless the tone suggests support
  if (/\b(help|support|issue|problem)\b/i.test(input)) {
    matchedKeywords.push("/\\b(help|support|issue|problem)\\b/i");
    return { category: "general_support", matchedKeywords, superGroup: "support" };
  }

  return { category: "general_chat", matchedKeywords, superGroup: "general" };
}

function decideComplexity(
  wordCount: number,
  hasCode: boolean,
  hasUrls: boolean,
  superGroup?: CategorySuperGroup
): ClassificationComplexity {
  if (hasCode || hasUrls || wordCount > 180) {
    return "complex";
  }
  if (wordCount < 40 && superGroup === "general") {
    return "simple";
  }
  if (superGroup && ["developer", "trading", "investing", "analyst", "research"].includes(superGroup)) {
    return wordCount > 80 ? "complex" : "simple";
  }
  return wordCount > 120 ? "complex" : "simple";
}

function tierFor(
  policy: CategoryPolicy,
  complexity: ClassificationComplexity,
  confidence: number
): ClassificationModelTier {
  if (complexity === "complex" && policy.complexTier) {
    return policy.complexTier;
  }
  if (policy.confidenceFloor && confidence < policy.confidenceFloor && policy.complexTier) {
    return policy.complexTier;
  }
  return policy.defaultTier;
}

export function analyzeMessageMetadata(input: string): HeuristicRecommendation {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  const charCount = trimmed.length;
  const containsCode =
    /```/.test(trimmed) ||
    /\bfunction\b/.test(trimmed) ||
    /\bcontract\b/.test(lower) ||
    /\basync\b/.test(lower);
  const containsUrls = /https?:\/\//i.test(trimmed);
  const containsWalletAddress = WALLET_REGEX.test(trimmed);
  const containsNumbers = /\d/.test(trimmed);

  const superGroupHint = detectSuperGroup(trimmed, lower);
  const {
    category,
    matchedKeywords,
    superGroup: resolvedSuperGroup,
  } = chooseCategory(trimmed, lower, superGroupHint);

  const policy = getCategoryPolicy(category);

  const complexity = decideComplexity(wordCount, containsCode, containsUrls, resolvedSuperGroup);

  let baseConfidence = 0.35;

  if (matchedKeywords.length > 0) baseConfidence += 0.25;
  if (containsCode) baseConfidence += 0.2;
  if (containsWalletAddress) baseConfidence += 0.1;
  if (superGroupHint) baseConfidence += 0.1;

  baseConfidence = Math.min(0.9, baseConfidence);

  const tier = tierFor(policy, complexity, baseConfidence);

  return {
    category,
    route: policy.route,
    tier,
    complexity,
    confidence: Number(baseConfidence.toFixed(2)),
    signals: {
      wordCount,
      charCount,
      containsCode,
      containsUrls,
      containsWalletAddress,
      containsNumbers,
      matchedKeywords,
      superGroup: resolvedSuperGroup,
    },
  };
}
