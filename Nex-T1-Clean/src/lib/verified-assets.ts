type VerificationTarget = {
  id?: string | null;
  slug?: string | null;
  symbol?: string | null;
  name?: string | null;
};

const VERIFIED_SYMBOLS = new Set([
  "btc",
  "eth",
  "sol",
  "usdt",
  "usdc",
  "doge",
  "xrp",
  "bnb",
  "steth",
]);

const VERIFIED_IDS = new Set([
  "bitcoin",
  "ethereum",
  "solana",
  "tether",
  "usd-coin",
  "dogecoin",
  "ripple",
  "xrp",
  "binancecoin",
  "bnb",
  "staked-ether",
]);

const VERIFIED_NAMES = new Set([
  "bitcoin",
  "ethereum",
  "solana",
  "tether",
  "usdt",
  "usd coin",
  "usdc",
  "dogecoin",
  "doge",
  "xrp",
  "ripple",
  "bnb",
  "binance coin",
  "binance smart chain",
  "steth",
  "staked ether",
  "lido staked ether",
]);

function normalize(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.toLowerCase() : null;
}

export function isVerifiedAsset({ id, slug, symbol, name }: VerificationTarget): boolean {
  const normalizedSymbol = normalize(symbol);
  const normalizedId = normalize(id ?? slug);
  const normalizedName = normalize(name);

  return (
    (normalizedSymbol != null && VERIFIED_SYMBOLS.has(normalizedSymbol)) ||
    (normalizedId != null && VERIFIED_IDS.has(normalizedId)) ||
    (normalizedName != null && VERIFIED_NAMES.has(normalizedName))
  );
}

export const VERIFIED_ASSETS = {
  symbols: VERIFIED_SYMBOLS,
  ids: VERIFIED_IDS,
  names: VERIFIED_NAMES,
};
