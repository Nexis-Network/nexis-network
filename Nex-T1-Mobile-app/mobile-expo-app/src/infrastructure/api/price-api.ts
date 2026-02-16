/**
 * CoinGecko price API client.
 *
 * Fetches USD prices and 24h change percentages for batches of tokens.
 * Uses the free /simple/price endpoint. Rate-limited to ~10-30 req/min
 * depending on API key tier.
 *
 * All functions return `Result<T, PriceError>` — callers never need to
 * catch exceptions.
 */

import { getEnv } from '@config/env';
import { type Result, success, failure, timestampNow } from '@domain/common/types';
import { type TokenPrice, PriceError } from '@domain/market/entities/price';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const REQUEST_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Batch-fetch USD prices from CoinGecko.
 *
 * @param ids - CoinGecko token IDs (e.g. ["ethereum", "solana"]).
 * @returns An array of TokenPrice objects for IDs that resolved.
 */
export async function fetchPrices(
  ids: readonly string[],
): Promise<Result<TokenPrice[], PriceError>> {
  if (ids.length === 0) return success([]);

  const deduped = [...new Set(ids)];
  const idsParam = deduped.join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = getEnv().COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return failure(
        new PriceError(`CoinGecko HTTP ${response.status}`, 'HTTP_ERROR'),
      );
    }

    const data = (await response.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;

    const now = timestampNow();
    const prices: TokenPrice[] = [];

    for (const id of deduped) {
      const entry = data[id];
      if (!entry || entry.usd == null) continue;

      prices.push({
        id,
        symbol: id, // Caller can enrich with proper symbol
        usdPrice: entry.usd,
        change24h: entry.usd_24h_change ?? 0,
        lastUpdated: now,
      });
    }

    return success(prices);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return failure(new PriceError('CoinGecko request timed out', 'TIMEOUT'));
    }
    return failure(
      new PriceError(
        `Price fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
  }
}

/**
 * Fetch a single token price by CoinGecko ID.
 */
export async function fetchPrice(
  id: string,
): Promise<Result<TokenPrice | undefined, PriceError>> {
  const result = await fetchPrices([id]);
  if (!result.ok) return result;
  return success(result.value.find((p) => p.id === id));
}
