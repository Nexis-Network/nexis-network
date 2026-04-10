# Nex-T1 Performance Upgrade Plan

**Date:** 2026-04-07
**Branch:** feat/performance-upgrade
**Approach:** Delete-and-rebuild with TDD red-green-refactor

---

## Executive Summary

Five parallel code review agents analyzed the Nex-T1 codebase across Next.js 16,
React 19, performance, state management, AI SDK v6, Supabase, Redis, and code
quality enforcement. This plan synthesizes all findings into a phased execution
roadmap.

### Critical Findings

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | `PersistQueryClientProvider` swap causes full subtree remount on every page load | P0 - Critical | Low |
| 2 | Zero `'use cache'` adoption despite `cacheComponents: true` enabled | P0 - Critical | Medium |
| 3 | Triple redundant auth calls on initial load (`getUser`, `useAuthStatus`, `useServerSessionReady`) | P0 - Critical | Medium |
| 4 | Only 17/120 routes have `loading.tsx` (14% coverage) | P1 - High | Low |
| 5 | Only 6/120 routes have `error.tsx` | P1 - High | Low |
| 6 | 22 files use plain `<img>` instead of `next/image` | P1 - High | Low |
| 7 | 10 components exceed 900 LOC (largest: 1,465 LOC) | P1 - High | High |
| 8 | 344 `getSupabaseAdminClient` calls vs 56 user-scoped (6:1 ratio) | P1 - Security | High |
| 9 | 18-level provider nesting in authenticated routes | P2 - Medium | Medium |
| 10 | Three competing Redis caching abstractions | P2 - Medium | Medium |
| 11 | Font `preload: false` on primary body font | P2 - Medium | Trivial |
| 12 | No CI/CD pipeline, no pre-commit hooks | P2 - Medium | Medium |

---

## Phase 0: Quick Wins (1-2 days, no architectural changes)

These are single-line or single-file changes with outsized impact.

### 0.1 Fix Font Preloading

**File:** `src/lib/fonts.ts`
**Change:** Set `preload: true` for `geistSans` (the primary body font).
**Why:** `preload: false` causes FOIT/FOUT, delaying FCP by 100-300ms.

### 0.2 Fix PersistQueryClientProvider Double Mount

**File:** `src/components/providers/app-providers.tsx`
**Change:** Initialize the persister synchronously in `useState` initializer instead
of `useEffect`. Replace:
```ts
// BEFORE (causes unmount/remount of entire subtree)
useEffect(() => { setPersister(createSyncStoragePersister(...)) }, [])

// AFTER (stable from first render)
const [persister] = useState(() =>
  typeof window === "undefined" ? null : createSyncStoragePersister(...)
)
```
**Why:** The current `useEffect`-based initialization causes the provider tree to
swap from `QueryClientProvider` to `PersistQueryClientProvider` on second render,
unmounting all children (destroying auth listeners, wallet connections, SSE streams).

### 0.3 Set Default React Query staleTime/gcTime

**File:** `src/components/providers/query-client.ts`
**Change:** Add defaults:
```ts
defaultOptions: {
  queries: {
    staleTime: 30_000,  // 30s - prevents refetch on remount
    gcTime: 10 * 60_000,  // 10m - matches persistence maxAge
    refetchOnWindowFocus: false,
    retry: 1,
  },
}
```
**Why:** Default `staleTime: 0` causes every query to refetch on mount. Most data
in this app doesn't change every second.

### 0.4 Escalate `no-img-element` to Error

**File:** `eslint.config.mjs`
**Change:** `"@next/next/no-img-element": "error"` (currently `"warn"`)
**Why:** Prevents new plain `<img>` tags from being introduced.

### 0.5 Add DNS Preconnect for Supabase

**File:** `src/app/layout.tsx`
**Change:** Add `<link rel="preconnect" href="https://<SUPABASE_URL>">` in `<head>`.
**Why:** Auth is the first client-side call. Preconnect saves 100-200ms.

---

## Phase 1: Loading & Error Boundaries (2-3 days)

### 1.1 Add Missing loading.tsx Files

**Priority routes (create skeleton components):**

| Route | Skeleton Pattern |
|-------|-----------------|
| `(authenticated)/daos/loading.tsx` | DashboardShell + card grid skeleton |
| `(authenticated)/defi/swap/loading.tsx` | DashboardShell + swap card skeleton |
| `(authenticated)/defi/liquidity/loading.tsx` | DashboardShell + table skeleton |
| `(authenticated)/screener/loading.tsx` | DashboardShell + table rows skeleton |
| `(authenticated)/docs/[[...slug]]/loading.tsx` | Docs layout + content skeleton |
| `(authenticated)/wallets/send/loading.tsx` | DashboardShell + form skeleton |
| `(authenticated)/analytics/assets/[assetType]/[slug]/loading.tsx` | Chart + stats skeleton |
| `(authenticated)/ai-leaderboard/loading.tsx` | Table skeleton |
| `(authenticated)/admin/loading.tsx` | Dashboard skeleton |
| `(authenticated)/vesting/loading.tsx` | Table skeleton |
| `(authenticated)/rewards/loading.tsx` | Card grid skeleton |
| `(authenticated)/projects/loading.tsx` | Card grid skeleton |
| `(marketing)/loading.tsx` | Centered spinner (covers all marketing) |
| `(marketing)/blog/(root)/loading.tsx` | Blog grid skeleton |

**Reference pattern:** Follow `src/app/(authenticated)/portfolio/loading.tsx`.

### 1.2 Add Missing error.tsx Files

**Priority (route group level):**

| Route | Rationale |
|-------|-----------|
| `(authenticated)/error.tsx` | Catches ALL authenticated errors. Most impactful. |
| `(marketing)/error.tsx` | Prevents raw errors on public pages. |
| `(authenticated)/portfolio/error.tsx` | External blockchain data fails often. |
| `(authenticated)/marketplace/error.tsx` | Multi-source aggregation. |
| `(authenticated)/settings/error.tsx` | 36+ sub-pages. |
| `(authenticated)/defi/error.tsx` | External RPC calls. |
| `(authenticated)/analytics/error.tsx` | External data APIs. |
| `(authenticated)/screener/error.tsx` | External market services. |

**Pattern:** Wrap in `DashboardShell`, include Sentry `captureException`, retry button.

---

## Phase 2: Auth & State Management (3-5 days)

### 2.1 Eliminate Redundant Auth Calls

**Files:**
- `src/components/providers/supabase-auth-provider.tsx`
- `src/lib/hooks/auth/use-server-session-ready.ts`
- `src/lib/hooks/user/use-auth-status.ts`

**Changes:**
1. In `applySessionState`: skip `supabase.auth.getUser()` when `nextSession.user`
   is already populated (the server verified it)
2. Expose `serverSessionReady` boolean from provider context; remove the separate
   `/api/auth/session` fetch in `useServerSessionReady`
3. Deprecate `useAuthStatus` -- consumers should use `useSupabaseStatus()`
4. Add a guard in `onAuthStateChange` to skip if initial `refresh()` is in-flight
5. Add `visibilitychange` listener with 30s debounce to handle tab-backgrounding

### 2.2 Fix Zustand Selector Anti-Patterns

**File:** `src/stores/use-swap-store.ts` + 17 consumer files
**Change:** Replace all `useSwapStore()` full-destructuring with individual selectors:
```ts
// BEFORE
const { sellToken, buyToken, isLoading } = useSwapStore()

// AFTER
const sellToken = useSwapStore((s) => s.sellToken)
const buyToken = useSwapStore((s) => s.buyToken)
```
For multi-field access, use `useShallow` from `zustand/react/shallow`.

**File:** `src/stores/use-market-prices.ts`
**Change:** Move `_eventSource`, `_reconnectTimer`, `_debounceTimer`,
`_cleanupTimer`, `_pollTimer` out of Zustand state into module-scoped variables.
Only `prices`, `subscribers`, `isConnected` remain reactive.

### 2.3 Provider Tree Optimization

**Current:** 18 levels of nesting from root to page content.

**Changes:**
1. Add `useMemo` wrapping in `AuthenticatedProviders` (missing, unlike `AppProviders`)
2. Move `WalletProvidersBoundary` from global tree to route-group layouts that need it
   (swap, portfolio, send, wallets) -- non-wallet routes skip 5 providers
3. Remove `usePathname()` from `AppProviders` -- use separate layout files instead
4. Verify `OnboardingGuard` and `NonCustodialWalletGuard` are guards (redirect-only),
   not context providers -- render as siblings, not nested wrappers

---

## Phase 3: Cache Components & PPR (3-5 days)

### 3.1 Adopt `'use cache'` Directive

The project has `cacheComponents: true` in next.config.mjs but zero adoption.

**Tier 1 -- Public/shared data (high traffic):**

| Function | File | cacheLife | cacheTag |
|----------|------|-----------|----------|
| `getPublicAgentMarketplace()` | `src/lib/agents/api.ts` | `"minutes"` | `"agent-marketplace"` |
| `getAgentDetail(id)` | `src/lib/agents/api.ts` | `"minutes"` | `"agent-detail:{id}"` |
| `getMarketplaceData()` | `src/lib/marketplace/data-access.ts` | `"minutes"` | `"marketplace-data"` |
| `getLaunchesData()` | `src/lib/launchpad/data-access.ts` | `"minutes"` | `"launches-data"` |
| `resolveDocsPageBySlug()` | `src/modules/docs/pages.ts` | `"days"` | `"docs-pages-index"` |
| Market overview data | `src/app/api/market-data/overview/` | `"minutes"` | `"market-overview"` |
| Trending tokens | `src/app/api/tools/market/trending/` | `"minutes"` | `"trending-tokens"` |

**Critical prerequisite:** Split auth-dependent functions from public data functions.
`getAgentMarketplace()` currently calls `readCookies()` at the top -- this is
incompatible with `'use cache'`. Create `getPublicAgentMarketplace()` that doesn't
read cookies.

**Tier 2 -- Content caches:**
- Blog data (already using `'use cache'` -- verify `cacheLife`)
- Docs markdown (already using `'use cache'` -- verify `cacheLife`)
- Template catalog (already using `'use cache'`)

### 3.2 Add Suspense Boundaries for PPR

Apply the portfolio-page pattern (static shell + Suspense-wrapped async content)
to these routes:

```tsx
// Pattern to apply:
export default function SomePage() {
  return (
    <DashboardShell>
      <Suspense fallback={<SomeSkeleton />}>
        <SomePageContent />
      </Suspense>
    </DashboardShell>
  );
}

async function SomePageContent() {
  const data = await fetchData();
  return <SomeView data={data} />;
}
```

**Routes to convert:**
1. `/agents/page.tsx` -- `getAgentMarketplace()` blocks entire page
2. `/marketplace/page.tsx` -- `getMarketplaceData()` blocks entire page
3. `/launches/page.tsx` -- `getLaunchesData()` blocks entire page
4. `/daos/page.tsx` -- `getCachedDaoDirectoryData()` blocks entire page
5. `/agents/[agentId]/page.tsx` -- multiple sequential awaits, parallelize with
   `Promise.all()` then wrap in Suspense

### 3.3 Rename middleware.ts to proxy.ts

Next.js 16 convention. The function is already named `proxy()` internally.

**Steps:**
1. Rename `middleware.ts` to `proxy.ts`
2. Export remains: `export { proxy } from "./src/proxy-handler"`
3. Keep `config.matcher` as-is
4. Test CSP injection, auth redirects, rate limiting, locale cookies

---

## Phase 4: Image & Bundle Optimization (2-3 days)

### 4.1 Migrate `<img>` to `next/image`

**High priority (above-fold, user-facing):**
- `src/components/defi/trending-token-card.tsx`
- `src/components/token-page/peers-card.tsx`
- `src/components/token-page/token-movers-card.tsx`
- `src/components/market-overview/right-rail/new-pairs-card.tsx`
- `src/components/market-overview/right-rail/top-movers-card.tsx`
- `src/components/market-overview/right-rail/trending-latest-card.tsx`
- `src/components/swap/chart/chart-header.tsx`

**Medium priority (authenticated pages):**
- `src/components/settings/wallets/nzt-rollup-wallet-card.tsx`
- `src/components/settings/portfolio/portfolio-page-client.tsx`
- `src/components/agents/agent-wizard.tsx`
- `src/components/sidebar/wallets/panels/wallet-approvals-panel.tsx`
- `src/components/sidebar/wallets/panels/wallet-protocols-panel.tsx`

### 4.2 Dynamic Import Heavy Libraries

**Recharts (40 files import directly):**
- Create lazy wrappers for chart components
- Priority: `ai-leaderboard-page.tsx`, `networth-chart.tsx`, admin dashboard charts

**Three.js (3 files):**
- `FluidGlass.tsx` and `FluidGlassButton.tsx` need dynamic import wrappers
  (orb.tsx already has `lazy-orb.tsx`)

**Framer Motion:** Already in `optimizePackageImports`. Verify not imported in
layout-level components.

### 4.3 React.memo on List Items

Add `React.memo` to components rendered N times per list:
- Market overview table row components (50-100+ rows)
- `agent-card.tsx` (agent grid)
- `wallet-carousel-card.tsx`
- `trending-token-card.tsx`

---

## Phase 5: Component Decomposition (5-7 days)

### 5.1 Break Apart Mega-Components

**`campaign-create-console.tsx` (1,465 LOC):**
- Extract `campaign-create-console/chain-config.ts` (static data ~200 LOC)
- Extract `campaign-create-console/stat-card.tsx`
- Extract `campaign-create-console/control-toggle.tsx`
- Extract `campaign-create-console/readiness-row.tsx`
- Extract `campaign-create-console/snapshot-row.tsx`
- Extract `campaign-create-console/flow-step.tsx`
- Target: main file ~800 LOC

**`agent-wizard.tsx` (1,311 LOC):**
- Extract `agent-wizard/schema.ts` (Zod schemas, tool catalog ~100 LOC)
- Extract `agent-wizard/pricing-row.tsx` (~100 LOC)
- Extract `agent-wizard/wizard-constants.ts`
- Further split: individual step components

**`token-asset-page.tsx` (1,106 LOC):**
- Extract `token-asset-page/data-builders.ts` (buildKeyThemes, etc. ~200 LOC)
- Extract `token-asset-page/constants.ts` (TABS, TIMEFRAMES ~30 LOC)
- Extract `token-asset-page/use-token-chart-data.ts` (chart query hook)
- Target: main file ~750 LOC

**`ai-leaderboard-page.tsx` (950 LOC):**
- Extract chart section to lazy-loaded `leaderboard-chart.tsx`
- Extract rankings table to `rankings-table.tsx`

Apply same pattern to: `campaign-dashboard.tsx` (974), `guardian-manager.tsx` (957),
`agent-policy-editor.tsx` (845), `sidebar.tsx` (835).

---

## Phase 6: AI SDK & Backend Optimization (3-5 days)

### 6.1 AI SDK Patterns

- Extract hardcoded `gateway("openai/gpt-4.1-mini")` from orchestrator workers
  into a shared `executeWorkerTask` utility with configurable model
- Replace worker dispatch `if/else` chain with `Map<string, Worker>` registry
- Add `onError` handler to `orchestratorAgent` (currently missing)

### 6.2 Supabase Admin Client Audit

344 `getSupabaseAdminClient` calls across 127 files vs 56 user-scoped calls.
Audit every usage. Only these should use admin:
- Webhook handlers (no user context)
- Cron jobs and background workers
- Cross-user operations (admin panel)
- Genuine RLS bypass needs (aggregation)

Everything else -> `getSupabaseServerClient({ accessToken })`.

### 6.3 Redis Caching Consolidation

Three competing patterns: `withRedisCache`, `getOrSet`, `getCachedValue`.
Consolidate to `getOrSet` as the canonical API (supports stale-while-revalidate,
coalescing, background refresh).

**Also fix:**
- `withRedisCache` doesn't cache null/falsy results (cache stampede on "not found")
- Add centralized TTL policy per data category
- Implement cache warming cron for hot market data keys

### 6.4 API Route Standardization

- Migrate all 53 files using raw `NextResponse.json({error})` to `apiResponse.*`
- Add `Cache-Control` headers to read-only GET endpoints
- Add `maxDuration` to routes calling external services
- Apply `withSingleFlight` to high-traffic GET endpoints

---

## Phase 7: CI/CD & Enforcement (2-3 days)

### 7.1 Claude Code Hooks

Configure in `.claude/settings.json`:

| Hook | Type | Purpose |
|------|------|---------|
| File size guard | PreToolUse Write/Edit | Block files > 500 LOC |
| `use client` guard | PreToolUse Write/Edit | Require justification |
| `any` type guard | PreToolUse Write/Edit | Block `any` types |
| Admin client guard | PreToolUse Write/Edit | Require justification |
| ESLint on save | PostToolUse Write/Edit | Auto-lint changed files |
| Test reminder | PostToolUse Write | Remind to create tests |

### 7.2 GitHub Actions CI

Create `.github/workflows/ci.yml`:
- **lint** -- `pnpm lint:ci`
- **typecheck** -- `pnpm typecheck`
- **unit-tests** -- `pnpm vitest run --coverage`
- **e2e** -- `pnpm test:e2e`
- **build** -- `pnpm build`

### 7.3 Pre-Commit Hooks

Install husky + lint-staged:
- ESLint `--fix --max-warnings 0` on staged `.ts/.tsx` files
- Runtime JS check on staged `.js/.mjs` files

### 7.4 ESLint Rule Additions

- `@next/next/no-img-element`: `"error"` (currently `"warn"`)
- `no-console`: `["warn", { allow: ["warn", "error"] }]` in `src/**`
- Admin client import restriction in component files
- `useSearchParams` restriction in page files (must be in Suspense-wrapped child)
- `server-only` enforcement for `src/server/**` files

---

## Phase 8: Dev Experience (1-2 days)

### 8.1 Switch Dev Default to Turbopack

**File:** `scripts/dev.sh`
**Change:** `DEV_BUNDLER=${NEXT_DEV_BUNDLER:-turbopack}` (currently `webpack`)

### 8.2 Add Port Conflict Detection

**File:** `scripts/dev.sh`
**Change:** Check if port is in use before starting dev server.

### 8.3 Deduplicate CLAUDE.md

Root `CLAUDE.md` and `.claude/CLAUDE.md` are identical. Symlink root to `.claude/`.

---

## TDD Protocol (encode in CLAUDE.md)

### When to Apply
New server modules, API handlers, domain logic in `src/modules/`, utility functions,
and any bug fix.

### The Loop

**RED:** Create test file first. Write failing test. Run `pnpm vitest run <file>`.
Confirm it fails for the RIGHT reason.

**GREEN:** Write minimum code to pass. Run test. No features beyond what the test
demands.

**REFACTOR:** Clean up without changing behavior. Run test after every step. Run
`pnpm exec eslint <files>`.

### Coverage
- New modules: >80% line coverage
- Critical paths (auth, payments, admin): >95% coverage

---

## Execution Order

| Week | Phases | Focus |
|------|--------|-------|
| 1 | 0, 1 | Quick wins + loading/error boundaries |
| 2 | 2 | Auth + state management |
| 3 | 3 | Cache components + PPR |
| 4 | 4, 5a | Images + bundle + start component splitting |
| 5 | 5b, 6 | Finish component splitting + backend optimization |
| 6 | 7, 8 | CI/CD + dev experience |

Each phase: max 5 files per commit, typecheck + lint + test after every change.
