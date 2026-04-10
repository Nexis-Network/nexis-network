# AGENTS.md — API Layer

This file applies to all files under `src/app/api/`.

It extends the root `AGENTS.md` with stricter rules for route handlers, request validation, auth, response contracts, caching, and operational safety.

---

# Scope and Precedence

- This file applies to `src/app/api/**`.
- The root `AGENTS.md` still applies unless this file is more specific.
- Direct human instructions take precedence.
- If a requested implementation conflicts with this file, refactor the design before coding.

---

# API Layer Mission

The API layer is an HTTP boundary, not a business-logic dumping ground.

Route handlers must remain:
- thin
- typed
- validated
- auth-aware
- observable
- cache-aware
- easy to review

The API layer must delegate business logic to modules, services, workflows, or shared infrastructure.

---

# Hard File Limits

- `route.ts`: soft max `120 LOC`, hard max `180 LOC`
- route schema file: soft max `120 LOC`, hard max `220 LOC`
- route mapper file: soft max `120 LOC`, hard max `180 LOC`
- route auth file: soft max `120 LOC`, hard max `180 LOC`
- route service adapter file: soft max `150 LOC`, hard max `220 LOC`

## Mandatory Split Triggers

Split immediately if a route file includes more than 3 of the following:
- auth
- validation
- request parsing
- business logic
- provider orchestration
- cache invalidation
- response mapping
- error shaping
- audit logging

Preferred split pattern:

```txt
route.ts
route.schema.ts
route.auth.ts
route.mapper.ts
route.service.ts
```

---

# Route Handler Contract

Every route handler must:

1. **Authenticate** — verify session or token before touching business logic
2. **Validate** — parse and validate request body/params using Zod schema
3. **Delegate** — call a service, workflow, or domain module for business logic
4. **Map** — transform the domain result into a typed HTTP response
5. **Handle errors** — catch and shape errors into consistent HTTP error responses
6. **Return typed responses** — use `NextResponse.json()` with explicit status codes

Route handlers must NOT:
- contain raw SQL
- contain provider SDK orchestration inline
- contain complex transformation logic
- contain domain logic not delegated to a service or workflow
- bypass auth checks for non-public endpoints
- return untyped or unshapen error objects

---

# Authentication Rules

- Every protected route must call the auth helper at the top of the handler before any other logic.
- Auth must use server-side session validation only. Never trust client-supplied auth state.
- Auth failures must return `401 Unauthorized` immediately.
- Authorization failures (user lacks permission for the operation) must return `403 Forbidden`.
- Extract user identity once; do not re-derive it inline throughout the handler.
- Auth helper must be imported from `src/lib/auth` or equivalent server-only module.

---

# Validation Rules

- Validate all incoming request body, query params, and path params with Zod schemas.
- Schema files live in `route.schema.ts` co-located with the route.
- Validation failures must return `400 Bad Request` with structured error details.
- Do not pass raw unvalidated data deeper into services or workflows.
- Prefer typed DTOs: validate at the boundary, pass typed objects inward.

---

# Response Contract Rules

- Use consistent response shapes across all routes in the same subdomain.
- Successful responses: `{ data: T }` or `{ data: T, meta: M }` pattern.
- Error responses: `{ error: { code: string; message: string; details?: unknown } }`.
- Use proper HTTP status codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
- Never expose raw stack traces, internal error objects, or DB-layer errors to clients.
- Use `NextResponse.json()` — do not construct raw `Response` objects inline unless strictly necessary.

---

# Caching Rules

All caching decisions in the API layer must be documented inline with:
- cache key
- TTL or invalidation rule
- user/tenant scope (shared vs user-private)
- consistency expectation

## Which routes may cache responses
- Public reference data routes: token metadata, chain registries, category lists → long TTL
- Volatile market data routes: prices, quotes → short TTL, background refresh acceptable
- AI summary routes: only if deterministic, input-hashable, and non-sensitive

## Which routes must never cache
- Routes that return user-private data without per-user cache key partitioning
- Routes that perform mutations or trigger side effects
- Routes that touch auth, session, or token state
- Routes that return transactional data (balances, allowances, trade status)

---

# Rate Limiting Rules

- All mutation endpoints (POST, PUT, PATCH, DELETE) must have rate limiting.
- All expensive AI or provider-orchestrating endpoints must have rate limiting.
- Rate limiting must use the shared rate-limit infrastructure in `src/lib` — do not implement ad hoc per-route rate limiting.
- Rate limit failures must return `429 Too Many Requests`.

---

# Error Handling Rules

- Do not let unhandled exceptions propagate to the Next.js default error handler.
- Wrap handler logic in a try/catch or use a shared error handling wrapper.
- Log errors using the shared logger (`src/lib/logger`).
- Map domain errors to appropriate HTTP status codes in `route.mapper.ts` or the error handler.
- Do not expose internal service, database, or provider error details to API consumers.

---

# Observability Rules

- All API routes should be instrumented with structured logging for:
  - request start
  - auth outcome
  - validation outcome
  - delegation result
  - response status
- Use correlation IDs or request IDs for tracing.
- Do not log PII, secrets, credentials, or sensitive financial data.
- Integrate with Sentry for unhandled errors and unexpected failures.

---

# Security Rules (Additive to Root)

- Never trust `req.headers` for identity. Use server-verified session only.
- Sanitize all user-supplied string inputs before logging or including in error messages.
- Rate-limit all auth-adjacent endpoints aggressively.
- Do not expose internal service names, DB table names, or infrastructure details in error responses.
- Always verify CSRF protection is in place for state-mutating routes where applicable.
- Enforce idempotency keys on routes where duplicate execution can cause data or financial damage.

---

# Placement Rules

- `src/app/api/[domain]/route.ts` — the HTTP handler only
- `src/app/api/[domain]/route.schema.ts` — Zod validation schemas
- `src/app/api/[domain]/route.auth.ts` — auth/authz helpers specific to this route
- `src/app/api/[domain]/route.mapper.ts` — request/response mapping logic
- `src/app/api/[domain]/route.service.ts` — thin adapter to the domain module service

Business logic must not live in any of the above files. It must live in:
- `src/modules/[domain]/services/`
- `src/modules/[domain]/workflows/`
- `src/lib/[domain]/`

---

# AI / Agent API Routes

Routes under `src/app/api/agents/` and `src/app/api/chat/` have additional constraints:

- All AI model calls must be delegated to domain services in `src/modules/ai/` or `src/modules/agents/`.
- Streaming responses must use `StreamingTextResponse` or equivalent — never buffer large LLM outputs.
- Tool calls and tool results must be validated before passing into the agent loop.
- Rate limiting must be applied to all AI routes — these are expensive operations.
- AI route handlers must be instrumented with latency tracking and model usage logging.
- Never expose raw model provider error messages to the API consumer without sanitization.

---

# Delivery Checklist (API Layer)

Before submitting any API route change:

1. Confirm handler is thin: auth → validate → delegate → map → respond
2. Confirm no business logic is inlined in the route file
3. Confirm Zod schemas cover all inputs
4. Confirm consistent response shape
5. Confirm cache decisions are documented (if any)
6. Confirm rate limiting is present (if mutation or expensive endpoint)
7. Confirm error handling does not leak internals
8. Run: `pnpm run lint && pnpm run typecheck`
9. Run targeted integration test for the route if available
