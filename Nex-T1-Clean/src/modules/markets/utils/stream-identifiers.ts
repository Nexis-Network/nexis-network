const COMMON_COIN_ALIASES: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  bnb: "binancecoin",
  matic: "matic-network",
  arb: "arbitrum",
  op: "optimism",
  link: "chainlink",
  xrp: "ripple",
  doge: "dogecoin",
  usdt: "tether",
  usdc: "usd-coin",
};

const CHAIN_QUALIFIED_COIN_PATTERN = /^([a-z0-9-]+):\d+$/i;
const CHAIN_SCOPED_EVM_ASSET_PATTERN = /^\d+-(0x[a-f0-9]{40})$/i;
const EVM_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i;
const SIMPLE_COIN_ID_PATTERN = /^[a-z0-9-]+$/i;

export function normalizeMarketStreamLookupToken(value: string): string {
  return value.trim().toLowerCase();
}

export function extractMarketStreamAddressCandidate(
  value: string,
): string | null {
  const normalized = normalizeMarketStreamLookupToken(value);
  if (!normalized) {
    return null;
  }

  const scopedMatch = normalized.match(CHAIN_SCOPED_EVM_ASSET_PATTERN);
  if (scopedMatch?.[1]) {
    return scopedMatch[1];
  }

  return EVM_ADDRESS_PATTERN.test(normalized) ? normalized : null;
}

export function extractMarketStreamCoinCandidate(
  value: string,
): string | null {
  const normalized = normalizeMarketStreamLookupToken(value);
  if (!normalized) {
    return null;
  }

  const chainQualifiedMatch = normalized.match(CHAIN_QUALIFIED_COIN_PATTERN);
  if (chainQualifiedMatch?.[1]) {
    const prefixed = chainQualifiedMatch[1];
    return COMMON_COIN_ALIASES[prefixed] ?? prefixed;
  }

  if (!SIMPLE_COIN_ID_PATTERN.test(normalized)) {
    return null;
  }

  return COMMON_COIN_ALIASES[normalized] ?? normalized;
}
