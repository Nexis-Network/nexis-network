# AGENTS.md — Markets Module

This file applies to all files under `src/modules/markets/`.

It extends the root `AGENTS.md` with domain-specific rules for market data services, caching, provider integrations, and financial data contracts.

---

# Scope and Precedence

- This file applies to `src/modules/markets/**`.
- The root `AGENTS.md` still applies unless this file is more specific.
- Direct human instructions take precedence.
- If a requested implementation conflicts with this file, refactor the design before coding.

---

# Module Mission

The Markets module owns:
- Market data service interfaces and implementations
- Token price, quote, OHLCV, and market cap data
- Market overview, trending, and screener features
- Market data cache layers and invalidation policies
- Provider adapter interfaces (Birdeye, Moralis, CoinGecko, etc.)

The Markets module does NOT own:
- Raw provider SDK initialization (delegate to `src/lib/birdeye/`, `src/lib/market-overview/`, etc.)
- Auth/session management (delegate to `src/lib/auth`)
- Portfolio aggregation (delegate to `src/modules/portfolio/` or relevant lib)
- Wallet balances (delegate to `src/modules/wallet/`)
- General HTTP utilities (delegate to `src/lib/http/`)

---

# Directory Structure

```txt
src/modules/markets/
  components/       # Market UI components (price displays, charts, screeners)
  hooks/            # Market data hooks (useTokenPrice, useMarketOverview, etc.)
  server/           # Server-only market data fetching and SSR support
  services/         # Market data service implementations
  schemas/          # Zod schemas for market data contracts and API params
  cache/            # Cache key factories, TTL constants, invalidation helpers
  types/            # TypeScript types for market data, provider responses, DTOs
  utils/            # Pure market data formatting, normalization, and calculation utils
  tests/            # Unit and integration tests
```

---

# Data Freshness Rules

Market data has strict freshness requirements that must be explicitly honored:

| Data Type | Max TTL | Strategy |
|---|---|---|
| Real-time spot price | 10–30s | Short TTL + stale-while-revalidate |
| OHLCV candles (1m) | 60s | Short TTL |
| OHLCV candles (1h+) | 5–15 min | Medium TTL |
| Market cap / FDV | 5 min | Medium TTL |
| Trending / Movers | 60–120s | Short TTL |
| Token metadata | 1 hour+ | Long TTL, tag by token ID |
| Chain registries | 24 hours | Long TTL, tag by chain |

All cache decisions must be documented in `cache/` with:
- explicit key factory
- TTL constant
- invalidation trigger
- owner

---

# Caching Rules (Markets-Specific)

- All market data responses must be cached with the shortest acceptable TTL for the data type.
- Cache keys must include: chain + token address (+ resolution for OHLCV) — never rely on display names.
- Stale-while-revalidate is acceptable for prices and trending data within documented staleness tolerance.
- Never serve stale price data for transactional or swap-adjacent operations — force fresh fetch.
- User-private data (portfolio values, personalized watchlists) must use user-scoped cache keys.
- Do not cache error responses or empty provider results.
- Background refresh jobs must be implemented as Supabase Edge Functions or server-side cron, not as ad hoc client-side polling.

---

# Provider Integration Rules

- All external provider calls must be made through typed adapter clients in `src/lib/`.
- Never call Birdeye, Moralis, CoinGecko, or other provider APIs directly from service files — use the lib adapter.
- Provider adapters must handle:
  - timeouts (bound all provider calls with a max duration)
  - retries with exponential backoff (max 3 retries)
  - circuit breaker for repeated failures
  - error normalization (map provider errors to typed domain errors)
- If a provider fails, fall back to cached data if available and within acceptable staleness — document this policy.
- Never expose raw provider error messages to UI or API consumers.

---

# Financial Data Accuracy Rules

- All price calculations must use BigInt or a decimal-safe library — never use floating-point arithmetic for financial values.
- Normalize token amounts by decimals before display or calculation.
- Display formatting (rounding, abbreviation) must happen at the presentation layer (components/utils), not in service or data layers.
- Do not mutate raw provider data in-place; always return new transformed objects.

---

# File and Function Limits

Inherited from root `AGENTS.md`:
- Service file: soft max `180 LOC`, hard max `250 LOC`
- Schema/validator file: soft max `180 LOC`, hard max `300 LOC`
- Utility file: soft max `120 LOC`, hard max `180 LOC`

Additional enforcement:
- Cache key factories in `cache/`: soft max `80 LOC`, hard max `120 LOC`
- Provider adapter wrappers: soft max `150 LOC`, hard max `220 LOC`

---

# Component Rules

Market UI components must:
- Be presentational — no direct provider SDK calls
- Receive typed market data as props or from hooks
- Handle loading, error, and empty states explicitly
- Avoid large inline data transformations; use utils
- Support skeleton loading states for all price and chart displays

Market hooks must:
- Use `useSWR`, `useQuery`, or equivalent for server data fetching
- Define explicit `staleTime` and `gcTime` / `cacheTime` based on data type
- Handle refetch-on-focus and refetch-on-reconnect appropriately for live data
- Return typed data, loading, and error state

---

# Testing Requirements

- Every market service method must have a unit test with a mocked provider adapter.
- Cache key factories must be tested for correct key generation across input variants.
- Price formatting utilities must be tested with edge cases: zero, very small, very large, negative.
- Integration tests must cover provider adapter error handling and fallback behavior.

---

# Delivery Checklist (Markets Module)

Before submitting any change to this module:

1. Data freshness requirements identified and TTL documented in `cache/`
2. Provider calls go through lib adapter — no direct SDK usage in service files
3. Financial math uses decimal-safe operations
4. Cache keys are complete and user-scoped where required
5. Error handling normalizes provider errors to typed domain errors
6. No stale price data served for transactional operations
7. Components receive typed data — no raw provider response passthrough to UI
8. Run: `pnpm run lint && pnpm run typecheck`
9. Run targeted tests: `pnpm run test -- src/modules/markets`
