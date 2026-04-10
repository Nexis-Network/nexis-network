export const DEFAULT_VS_CURRENCY = "usd";

export const HERO_FILTERS = [
  { id: "all", label: "All", keywords: [], emoji: "🌐" },
  { id: "l1", label: "Layer 1", keywords: ["layer 1", "l1", "base layer"] },
  { id: "l2", label: "Layer 2", keywords: ["layer 2", "l2"] },
  { id: "defi", label: "DeFi", keywords: ["defi", "dex", "dexes", "lending"] },
  { id: "ai", label: "AI", keywords: ["ai", "artificial", "machine learning"] },
  { id: "rwa", label: "RWA", keywords: ["rwa", "real world"] },
  { id: "socialfi", label: "SocialFi", keywords: ["socialfi", "social"] },
  { id: "memefi", label: "MemeFi", keywords: ["memefi", "meme fi"] },
  { id: "memecoins", label: "Memecoins", keywords: ["memecoin", "meme"] },
  { id: "dex", label: "DEX", keywords: ["dex", "exchange", "amm"] },
] as const;

export const POPULAR_SPACES = [
  {
    id: "explorer",
    title: "Crypto Coin Explorer",
    description: "Enter any cryptocurrency to get an up-to-date overview.",
    emoji: "🔮",
    cta: "Analyze coins",
  },
  {
    id: "profiles",
    title: "Profile Builder",
    description: "Jumpstart due diligence with curated project dossiers.",
    emoji: "🧭",
    cta: "Build profiles",
  },
  {
    id: "questions",
    title: "Investor Question Generator",
    description: "Generate five strategic questions before you allocate.",
    emoji: "❓",
    cta: "Generate questions",
  },
] as const;

export const VIEWPORT_GUTTER = "320px";
