# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

---

## Project Overview

Nex-T1 is a production AI/DeFi platform built on **Next.js 16.1.6**, **React 19**,
**TypeScript 5** (strict mode), and **Tailwind CSS v4**. It combines AI agents
(Vercel AI SDK v6, Bedrock, OpenAI, Anthropic), multi-chain Web3 wallets (Solana,
Ethereum, Sui via Wagmi/Viem), and DeFi integrations (Uniswap, CoW, Jupiter) into
a single monolithic Next.js app with 120+ page routes and 462+ API endpoints.

---

## Build & Dev Commands

```bash
# Development
pnpm dev                    # Full dev server (fd-limit, lock cleanup, bundler select)
pnpm dev:raw                # Raw next dev (no wrappers)
NEXT_DEV_BUNDLER=turbopack pnpm dev  # Force Turbopack

# Build
pnpm build                  # Phased build (compile -> generate), 8GB heap

# Type checking
pnpm typecheck              # tsc --noEmit, 6GB heap, strict mode

# Linting
pnpm lint                   # ESLint + better-auth check
pnpm lint:ci                # Full suite: lint + runtime-js + untyped-json + dead + dup

# Testing
pnpm test                   # Vitest (watch mode)
pnpm vitest run             # Single run
pnpm vitest run src/path    # Single file/directory
pnpm test:e2e               # Playwright end-to-end

# Workers
pnpm worker                 # Workflow orchestration
pnpm worker:queue           # Task queue processor
pnpm worker:solana-agentkit # Solana autonomous agent
```

**Verification after every change:**
```bash
pnpm exec eslint <changed-files>   # Lint changed files
pnpm typecheck                      # Full type check
pnpm vitest run <test-file>         # Run relevant tests
```

---

## Architecture

### Route Groups
- `src/app/(authenticated)/` -- Protected routes (app, settings, agents, portfolio,
  defi, marketplace, launches, daos, docs, screener, analytics, etc.)
- `src/app/(marketing)/` -- Public marketing pages (home, blog, pricing, ecosystem)
- `src/app/auth/` -- Authentication flows (Supabase SSR)
- `src/app/api/` -- 462+ API route handlers

### Source Organization
- `src/server/` -- Server-only code (auth, services, database, security). Must
  include `import 'server-only'`. Never import from `@/components/*`.
- `src/modules/` -- Domain logic (chat, agents, wallets, settings, daos, etc.).
  Must stay UI-free.
- `src/lib/` -- Shared utilities, API clients, data access functions.
- `src/components/` -- React components. UI primitives in `ui/`, features in
  domain directories.
- `src/stores/` -- Zustand stores (chain, sidebar, swap, market prices).
- `src/hooks/` -- Client-side hooks. `src/lib/hooks/` for shared hooks.
- `src/config/` -- Environment validation (Zod schemas).

### Domain Boundaries (enforced by ESLint)
- `src/server/**` and `src/modules/**` cannot import from `@/components/*`
- Client hooks cannot import from `@/server/*`
- `src/modules/watchlist/**`, `src/lib/approvals/**`, `src/modules/tasks/**`,
  `src/modules/settings/**` cannot import `@/components/*`

### Key Patterns

**Provider hierarchy (authenticated routes):**
```
RootLayout (RSC) -> RequestScopedBody (RSC) -> AppProviders (client)
  -> PersistQueryClientProvider -> SupabaseAuthBoundary
  -> WalletProvidersBoundary -> AuthenticatedProviders -> {page}
```

**Data fetching:** Server Components fetch data directly. Client components use
TanStack React Query 5. Zustand for UI state only.

**Auth:** Supabase SSR with JWT tokens. Server-side verification via
`src/server/auth/session.ts` (3-tier cache: in-process Map -> Redis -> Supabase
getUser with hedged requests).

**AI:** Vercel AI SDK v6 with `ToolLoopAgent` pattern in
`src/modules/chat/app-chat-agent.ts`. Streaming via `createUIMessageStream`.

**Caching:** `cacheComponents: true` enabled in next.config.mjs. Use `'use cache'`
directive with `cacheLife()` and `cacheTag()` for server-side caching. Redis
(Upstash) via `getOrSet<T>` for cross-request caching.

---

## Conventions

### Component Pattern (follow portfolio page as reference)
```tsx
// Static shell renders immediately (PPR-compatible)
export default function SomePage() {
  return (
    <DashboardShell>
      <Suspense fallback={<SomeSkeleton />}>
        <SomePageContent />
      </Suspense>
    </DashboardShell>
  );
}

// Async data fetched inside Suspense boundary
async function SomePageContent() {
  const data = await fetchData();
  return <SomeView data={data} />;
}
```

### Caching Pattern
```tsx
import { cacheLife, cacheTag } from 'next/cache'

async function getPublicData(id: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag('data-type', `data-${id}`)
  return db.query(id)
}
```

### Zustand Selectors (prevent unnecessary re-renders)
```tsx
// WRONG: subscribes to all state changes
const { sellToken, buyToken } = useSwapStore()

// RIGHT: subscribe only to what you need
const sellToken = useSwapStore((s) => s.sellToken)
```

### Supabase Client Usage
- `getSupabaseServerClient({ accessToken })` -- User-scoped, respects RLS.
  **Default choice.**
- `getSupabaseAdminClient()` -- Bypasses RLS. Only for webhooks, crons, cross-user
  operations, or genuine aggregation needs. Requires justification.

### Image Optimization
Always use `next/image` over `<img>`. ESLint enforces this as error.

### File Size Limits
Components and modules should stay under 500 LOC. If a file exceeds this,
propose splitting before editing. Reference: 10 components currently exceed
900 LOC and are tracked for decomposition.

---

## TDD Protocol

Apply for: new server modules, API handlers, domain logic, utility functions,
bug fixes. Skip for: pure UI components (use Playwright), CSS, config.

**RED:** Create test file first at `tests/<mirror-path>/<name>.test.ts`. Write
failing test. Run `pnpm vitest run <file>`. Confirm it fails for the right reason.

**GREEN:** Write minimum code to pass. No features beyond what the test demands.

**REFACTOR:** Clean up without changing behavior. Run test + lint after every step.

**Coverage:** New modules >80% line coverage. Critical paths (auth, payments) >95%.

---

## Production-Grade Agent Directives

The governing loop: **gather context -> take action -> verify work -> repeat.**

### Pre-Work
- **Delete before you build:** Remove dead code from files >300 LOC before refactoring.
  Commit cleanup separately.
- **Phased execution:** Max 5 files per phase. Verify between phases.
- **Plan and build are separate:** Output only the plan when asked to plan. No code
  until approved.
- **Spec-based development:** For 3+ step features, enter plan mode. Interview the
  user before writing code.

### Understanding Intent
- **Follow references, not descriptions:** Match existing code patterns exactly.
- **Work from raw data:** Trace actual errors, don't guess.
- **One-word mode:** "yes" / "do it" / "push" = execute without commentary.

### Code Quality
- **Senior dev override:** Propose structural fixes for flawed architecture.
- **Forced verification:** Run typecheck, lint, and tests before claiming completion.
- **Write human code:** No robotic comments. No over-engineering.

### Context Management
- **Sub-agent swarming:** >5 independent files = parallel sub-agents (5-8 files each).
- **Context decay awareness:** Re-read files before editing after 10+ messages.
- **File read budget:** 2,000 lines per read. Chunk files >500 LOC.

### Edit Safety
- Re-read before and after every edit. Max 3 edits per file without verification.
- Search all reference types when renaming (calls, types, strings, dynamic imports,
  re-exports, tests).
- One source of truth. Never duplicate state to fix display issues.

### Self-Improvement
- Log corrections to `gotchas.md`. Conduct bug autopsies. Present two perspectives
  when reviewing own work. Stop after two failed attempts and rethink.
