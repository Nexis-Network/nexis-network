export type SourceBrand =
  | "coingecko"
  | "fourchan"
  | "x_twitter"
  | "dropbox"
  | "apple"
  | "google_drive"
  | "yahoo"
  | "google"
  | "google_maps"
  | "yelp"
  | "wikipedia"
  | "tradingview"
  | "medium"
  | "github"
  | "discord"
  | "telegram"
  | "twitch"
  | "coinmarketcap"
  | "okx"
  | "kraken"
  | "kucoin"
  | "coinbase"
  | "binance"
  | "aave"
  | "uniswap"
  | "pancakeswap"
  | "aerodrome"
  | "facebook"
  | "zhihu"
  | "instagram";

export type SourceIconDefinition = {
  src: string;
  label: string;
};

export const SOURCE_ICON_MAP: Record<SourceBrand, SourceIconDefinition> = {
  coingecko: { src: "/assets/sources-icons/CoinGecko/coingecko.svg", label: "CoinGecko" },
  fourchan: { src: "/assets/sources-icons/4chan.svg", label: "4chan" },
  x_twitter: { src: "/assets/sources-icons/X-Twitter.svg", label: "X / Twitter" },
  dropbox: { src: "/assets/sources-icons/drop-box.svg", label: "Dropbox" },
  apple: { src: "/assets/sources-icons/apple.svg", label: "Apple" },
  google_drive: { src: "/assets/sources-icons/google-drive.svg", label: "Google Drive" },
  yahoo: { src: "/assets/sources-icons/yahoo.svg", label: "Yahoo" },
  google: { src: "/assets/sources-icons/google.svg", label: "Google" },
  google_maps: { src: "/assets/sources-icons/google-maps.svg", label: "Google Maps" },
  yelp: { src: "/assets/sources-icons/yelp.svg", label: "Yelp" },
  wikipedia: { src: "/assets/sources-icons/wikipedia.svg", label: "Wikipedia" },
  tradingview: { src: "/assets/sources-icons/TradingView/TradingView.svg", label: "TradingView" },
  medium: { src: "/assets/sources-icons/medium.svg", label: "Medium" },
  github: { src: "/icons/social-icons/github.svg", label: "GitHub" },
  discord: { src: "/assets/sources-icons/discord.svg", label: "Discord" },
  telegram: { src: "/assets/sources-icons/telegram.svg", label: "Telegram" },
  twitch: { src: "/assets/sources-icons/twitch.svg", label: "Twitch" },
  coinmarketcap: { src: "/assets/sources-icons/CoinMarketCap/coinmarketcap.svg", label: "CoinMarketCap" },
  okx: { src: "/assets/sources-icons/OKX/OKX.svg", label: "OKX" },
  kraken: { src: "/assets/sources-icons/Kraken/kraken.svg", label: "Kraken" },
  kucoin: { src: "/assets/sources-icons/KuCoin/KuCoin.svg", label: "KuCoin" },
  coinbase: { src: "/icons/social-icons/coinbase.svg", label: "Coinbase" },
  binance: { src: "/assets/sources-icons/Binance/Binance.svg", label: "Binance" },
  aave: { src: "/icons/web3-icons/aave.svg", label: "Aave" },
  uniswap: { src: "/assets/DEX-logos/uniswap.svg", label: "Uniswap" },
  pancakeswap: { src: "/assets/DEX-logos/pancakeswap.svg", label: "PancakeSwap" },
  aerodrome: { src: "/assets/exchanges/aerodrome.webp", label: "Aerodrome" },
  facebook: { src: "/assets/sources-icons/facebook.svg", label: "Facebook" },
  zhihu: { src: "/assets/sources-icons/Zhihu.svg", label: "Zhihu" },
  instagram: { src: "/assets/sources-icons/instagram.svg", label: "Instagram" },
};

const DOMAIN_RULES: Array<{ brand: SourceBrand; domains: string[] }> = [
  { brand: "coingecko", domains: ["coingecko.com"] },
  { brand: "fourchan", domains: ["4chan.org"] },
  { brand: "x_twitter", domains: ["x.com", "twitter.com", "t.co"] },
  { brand: "dropbox", domains: ["dropbox.com", "dropboxusercontent.com"] },
  { brand: "apple", domains: ["apple.com", "apple.news"] },
  { brand: "google_drive", domains: ["drive.google.com", "docs.google.com"] },
  { brand: "yahoo", domains: ["yahoo.com", "finance.yahoo.com", "news.yahoo.com"] },
  { brand: "google_maps", domains: ["maps.google.com", "maps.app.goo.gl"] },
  { brand: "google", domains: ["google.com"] },
  { brand: "yelp", domains: ["yelp.com"] },
  { brand: "wikipedia", domains: ["wikipedia.org"] },
  { brand: "tradingview", domains: ["tradingview.com"] },
  { brand: "medium", domains: ["medium.com"] },
  { brand: "github", domains: ["github.com"] },
  { brand: "discord", domains: ["discord.com", "discord.gg"] },
  { brand: "telegram", domains: ["telegram.org", "t.me"] },
  { brand: "twitch", domains: ["twitch.tv"] },
  { brand: "coinmarketcap", domains: ["coinmarketcap.com"] },
  { brand: "okx", domains: ["okx.com"] },
  { brand: "kraken", domains: ["kraken.com"] },
  { brand: "kucoin", domains: ["kucoin.com"] },
  { brand: "coinbase", domains: ["coinbase.com"] },
  { brand: "binance", domains: ["binance.com"] },
  { brand: "aave", domains: ["aave.com"] },
  { brand: "uniswap", domains: ["uniswap.org"] },
  { brand: "pancakeswap", domains: ["pancakeswap.finance"] },
  { brand: "aerodrome", domains: ["aerodrome.finance"] },
  { brand: "facebook", domains: ["facebook.com", "fb.com"] },
  { brand: "zhihu", domains: ["zhihu.com"] },
  { brand: "instagram", domains: ["instagram.com"] },
];

const TITLE_RULES: Array<{ brand: SourceBrand; patterns: string[] }> = [
  { brand: "coingecko", patterns: ["coingecko"] },
  { brand: "fourchan", patterns: ["4chan"] },
  { brand: "x_twitter", patterns: ["x ", " x/", "x.com", "twitter"] },
  { brand: "dropbox", patterns: ["dropbox"] },
  { brand: "apple", patterns: ["apple news", "apple"] },
  { brand: "google_drive", patterns: ["google drive", "gdrive"] },
  { brand: "yahoo", patterns: ["yahoo finance", "yahoo news", "yahoo"] },
  { brand: "google_maps", patterns: ["google maps", "maps.app.goo.gl"] },
  { brand: "google", patterns: ["google"] },
  { brand: "yelp", patterns: ["yelp"] },
  { brand: "wikipedia", patterns: ["wikipedia"] },
  { brand: "tradingview", patterns: ["tradingview"] },
  { brand: "medium", patterns: ["medium"] },
  { brand: "github", patterns: ["github"] },
  { brand: "discord", patterns: ["discord"] },
  { brand: "telegram", patterns: ["telegram"] },
  { brand: "twitch", patterns: ["twitch"] },
  { brand: "coinmarketcap", patterns: ["coinmarketcap"] },
  { brand: "okx", patterns: ["okx"] },
  { brand: "kraken", patterns: ["kraken"] },
  { brand: "kucoin", patterns: ["kucoin"] },
  { brand: "coinbase", patterns: ["coinbase"] },
  { brand: "binance", patterns: ["binance"] },
  { brand: "aave", patterns: ["aave"] },
  { brand: "uniswap", patterns: ["uniswap"] },
  { brand: "pancakeswap", patterns: ["pancakeswap"] },
  { brand: "aerodrome", patterns: ["aerodrome"] },
  { brand: "facebook", patterns: ["facebook"] },
  { brand: "zhihu", patterns: ["zhihu"] },
  { brand: "instagram", patterns: ["instagram"] },
];

const normalizeText = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

const readHostname = (url: string | null | undefined): string => {
  const raw = normalizeText(url);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  }
};

const hostMatches = (hostname: string, domainRule: string): boolean => {
  const normalizedDomain = domainRule.replace(/^www\./, "").toLowerCase();
  return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
};

export function resolveSourceBrand(input: { title?: string | null; url?: string | null }): SourceBrand | null {
  const hostname = readHostname(input.url);
  if (hostname) {
    for (const rule of DOMAIN_RULES) {
      if (rule.domains.some((domain) => hostMatches(hostname, domain))) {
        return rule.brand;
      }
    }
  }

  const text = `${normalizeText(input.title)} ${hostname}`;
  if (!text.trim()) {
    return null;
  }

  for (const rule of TITLE_RULES) {
    if (rule.patterns.some((pattern) => text.includes(pattern))) {
      return rule.brand;
    }
  }

  return null;
}

export function getSourceIconDefinition(input: { title?: string | null; url?: string | null }): SourceIconDefinition | null {
  const brand = resolveSourceBrand(input);
  return brand ? SOURCE_ICON_MAP[brand] : null;
}
