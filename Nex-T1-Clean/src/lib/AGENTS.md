# AGENTS.md — Shared Library / Infrastructure

This file applies to all files under `src/lib/`.

It extends the root `AGENTS.md` with rules specific to shared infrastructure helpers, integrations, platform clients, and cross-domain utilities.

---

# Scope and Precedence

- This file applies to `src/lib/**`.
- The root `AGENTS.md` still applies unless this file is more specific.
- Direct human instructions take precedence.
- If a requested implementation conflicts with this file, refactor the design before coding.

---

# Library Mission

`src/lib/` owns:
- Cross-domain infrastructure helpers (auth, db, cache, http, logger, telemetry, security)
- External provider SDK clients and adapter wrappers (Birdeye, Moralis, Supabase, Redis, Stripe, etc.)
- Shared validation utilities and formatters used across multiple domains
- Platform-level utilities (env, polyfills, feature flags, routing helpers)
- Shared type contracts used across multiple modules

`src/lib/` does NOT own:
- Domain business logic (that belongs in `src/modules/[domain]/`)
- UI components or React hooks (those belong in `src/components/` or `src/modules/[domain]/hooks/`)
- Route handlers or page files (those belong in `src/app/`)
- Domain-specific services or workflows (those belong in `src/modules/`)

---

# Core Design Rules

1. **Cross-domain only.** If a helper is only used by one module, it belongs in that module, not in `src/lib/`.
2. **Zero domain business logic.** Infrastructure must be domain-agnostic. Never encode business rules in lib helpers.
3. **No circular dependencies.** Lib must never import from `src/modules/` or `src/app/`.
4. **Explicit surface area.** Export only what consumers need. Do not barrel-export entire internal implementations.
5. **Server-only enforcement.** Files that contain secrets, DB connections, or privileged operations must be marked `server-only` or use `import 'server-only'`. They must never appear in client bundles.
6. **Testable in isolation.** Lib helpers must be independently testable without requiring full application context.

---

# Directory Structure and Placement Rules

```txt
src/lib/
  auth/             # Auth helpers, session utilities, server-only auth checks
  cache/            # Cache clients, key factories, TTL constants, invalidation helpers
  db/               # Supabase client initialization, query helpers, migration utilities
  http/             # Fetch wrappers, retry logic, timeout handling, circuit breakers
  logger/           # Structured logging utilities, log formatters, redaction
  telemetry/        # OpenTelemetry setup, tracing, metrics, Sentry integration
  security/         # Input sanitization, rate-limit helpers, CSRF utilities, encryption
  ai/               # AI SDK clients, provider initialization, prompt utilities
  memory/           # Unified memory provider, conversation context management
  birdeye/          # Birdeye API adapter client
  mcp/              # MCP protocol helpers and client
  supabase/         # Supabase client factory and SSR helpers
  billing/          # Stripe client adapter
  formatters/       # Shared number, date, and financial formatters
  validation/       # Shared Zod validators used across multiple domains
  utils/            # Pure general-purpose utilities (slugify, json, pagination, etc.)
  errors/           # Typed error classes and error normalization helpers
  constants/        # Shared constants and configuration values
```

---

# File and Function Limits

Inherited from root `AGENTS.md`:
- Utility file: soft max `120 LOC`, hard max `180 LOC`
- Service file (provider adapters): soft max `180 LOC`, hard max `250 LOC`

Additional enforcement:
- Provider adapter client files (e.g., birdeye client, moralis client): hard max `220 LOC` — split into sub-modules if nearing limit
- Auth helper files: hard max `180 LOC`
- Cache utility files: hard max `150 LOC`

---

# Provider Adapter Rules

All external provider SDK clients in `src/lib/` must:

1. Initialize with environment variables only — never hardcode credentials
2. Export a typed client factory or singleton (server-only)
3. Wrap all external calls with:
   - timeout bounds (`AbortSignal` or `signal` option)
   - retry logic with exponential backoff (max 3 retries by default)
   - circuit breaker for repeated failures (use `src/lib/circuit-breaker/` if available)
   - typed error normalization (map provider errors to domain error types)
4. Never expose raw SDK error objects to consumers — map to typed errors
5. Be independently testable with mocked HTTP or SDK responses
6. Be marked `server-only` if they require secret credentials

---

# Auth Library Rules

- Auth helpers must be server-only (`import 'server-only'`)
- Never expose session tokens, JWTs, or auth credentials to client bundles
- Session validation must verify token integrity server-side — never trust client-decoded payloads
- Auth helpers must return typed result objects (`{ user, session }` or `{ error }`) — never throw for expected auth failures
- RLS enforcement must be validated via Supabase RLS policies, not just application-layer checks

---

# Database Library Rules

- All Supabase client instances must be created through the factory in `src/lib/supabase/`
- Never construct raw Supabase clients outside of `src/lib/supabase/`
- Use the server client (`createServerClient`) for server-side operations; browser client only in explicit client contexts
- All queries must be typed — use generated types from Supabase type generation
- Long-running or expensive queries must have explicit timeouts
- Never log query results that may contain PII or sensitive financial data

---

# Cache Library Rules

- Cache clients (Redis, in-memory) must be initialized through `src/lib/cache/`
- Cache key factories must be pure functions with explicit parameter signatures
- TTL constants must be named descriptively (e.g., `TOKEN_METADATA_TTL_SECONDS`) and live in `cache/` or `constants/`
- Cache helpers must handle connection errors gracefully — cache miss is preferable to application crash
- Never store secrets, tokens, or unencrypted PII in cache layers

---

# Logger Rules

- All logging must go through the shared logger in `src/lib/logger/`
- Never use `console.log`, `console.error`, or `console.warn` in production code paths
- Log structured objects with explicit field names — never log raw objects with sensitive fields
- The logger must redact known sensitive fields (keys, tokens, passwords, mnemonics) automatically
- Log levels: `debug` (dev only), `info` (request flows, key events), `warn` (recoverable errors), `error` (unexpected failures)

---

# Telemetry and Observability Rules

- Use the shared telemetry helpers in `src/lib/telemetry/` for tracing and metrics
- All provider adapter calls must be instrumented with span tracking
- Sentry must be used for unhandled errors and critical failures only — not for expected validation or auth errors
- Performance-sensitive operations must emit duration metrics
- Never include PII, secrets, or sensitive financial data in trace attributes or metrics labels

---

# Security Library Rules

- Input sanitization utilities must be used at all trust boundaries
- Rate-limit helpers must be shared through `src/lib/security/` — do not reimplement per-route
- Encryption and hashing utilities must use well-vetted libraries (e.g., `crypto`, `bcrypt`, `argon2`) — never roll custom crypto
- CSRF protection utilities must be available and used for state-mutating server actions and routes

---

# Validation Library Rules

- Shared Zod schemas for cross-domain types live in `src/lib/validation/`
- Domain-specific schemas remain in `src/modules/[domain]/schemas/`
- Do not duplicate shared validators in multiple modules — consolidate in lib only when genuinely cross-domain

---

# Testing Requirements

- All lib helpers must have unit tests that run without external dependencies (mock providers, mock DB)
- Provider adapter tests must mock HTTP/SDK responses — no real network calls in unit tests
- Cache helper tests must use in-memory implementations or mocks
- Auth helper tests must mock Supabase session responses

---

# Delivery Checklist (Lib)

Before submitting any change to `src/lib/`:

1. Confirm helper is genuinely cross-domain (used by 2+ modules) — otherwise move to the owning module
2. Confirm no domain business logic is present
3. Confirm server-only files are marked with `import 'server-only'`
4. Confirm provider adapters have timeout, retry, and error normalization
5. Confirm no secrets or credentials are hardcoded
6. Confirm logger is used in place of `console.*`
7. Confirm new exports are minimal and typed
8. Run: `pnpm run lint && pnpm run typecheck`
9. Run targeted tests for the changed lib area
