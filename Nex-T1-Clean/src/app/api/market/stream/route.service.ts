import { getCoinDirectory } from "@/server/market/coingecko";
import {
  extractMarketStreamAddressCandidate,
  extractMarketStreamCoinCandidate,
  normalizeMarketStreamLookupToken,
} from "@/modules/markets/utils/stream-identifiers";

function parseCsvParam(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function resolveRequestedMarketStream(
  searchParams: URLSearchParams,
): Promise<{
  requestedCoinList: string[];
  resolvedMapping: Record<string, string>;
}> {
  const requestedCoins = new Set<string>();
  const requestedSymbols = new Set(
    parseCsvParam(searchParams.get("symbols"))
      .map(normalizeMarketStreamLookupToken)
      .filter(Boolean),
  );
  const requestedAddressKeys = new Set<string>();
  const requestedAddressSources = new Map<string, Set<string>>();
  const resolvedMapping: Record<string, string> = {};

  const trackAddress = (value: string, source: string) => {
    const normalizedAddress = normalizeMarketStreamLookupToken(value);
    if (!normalizedAddress) {
      return;
    }

    requestedAddressKeys.add(normalizedAddress);
    const knownSources = requestedAddressSources.get(normalizedAddress) ?? new Set<string>();
    knownSources.add(normalizeMarketStreamLookupToken(source));
    requestedAddressSources.set(normalizedAddress, knownSources);
  };

  for (const rawCoin of parseCsvParam(searchParams.get("coins"))) {
    const normalizedRawCoin = normalizeMarketStreamLookupToken(rawCoin);
    const addressCandidate = extractMarketStreamAddressCandidate(rawCoin);
    if (addressCandidate) {
      trackAddress(addressCandidate, normalizedRawCoin);
      continue;
    }

    const coinCandidate = extractMarketStreamCoinCandidate(rawCoin);
    if (!coinCandidate) {
      continue;
    }

    requestedCoins.add(coinCandidate);
    if (coinCandidate !== normalizedRawCoin) {
      resolvedMapping[normalizedRawCoin] = coinCandidate;
    }
  }

  for (const rawAddress of parseCsvParam(searchParams.get("addresses"))) {
    trackAddress(rawAddress, rawAddress);
  }

  if (requestedSymbols.size > 0 || requestedAddressKeys.size > 0) {
    const directoryRes = await getCoinDirectory();
    const directory = directoryRes.data || [];

    for (const entry of directory) {
      const symbol = normalizeMarketStreamLookupToken(entry.symbol);
      if (symbol && requestedSymbols.has(symbol)) {
        requestedCoins.add(entry.id);
        resolvedMapping[symbol] = entry.id;
      }

      if (!requestedAddressKeys.size || !entry.platforms) {
        continue;
      }

      for (const address of Object.values(entry.platforms)) {
        if (!address || typeof address !== "string") {
          continue;
        }

        const normalizedAddress = normalizeMarketStreamLookupToken(address);
        if (!requestedAddressKeys.has(normalizedAddress)) {
          continue;
        }

        requestedCoins.add(entry.id);
        const sources = requestedAddressSources.get(normalizedAddress) ?? new Set<string>();
        for (const source of sources) {
          resolvedMapping[source] = entry.id;
        }
      }
    }
  }

  return {
    requestedCoinList: Array.from(requestedCoins).sort(),
    resolvedMapping,
  };
}
