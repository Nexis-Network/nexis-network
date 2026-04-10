# AGENTS.md — App Router

This file applies to `src/app/**`.

`src/app/api/**` is governed more specifically by `src/app/api/AGENTS.md`.

## Mission

`src/app/` is the HTTP and route-entry boundary for the Next.js App Router. Keep it thin.

## File limits

- `page.tsx` / `layout.tsx`: soft max `120 LOC`, hard max `180 LOC`
- route handlers: soft max `120 LOC`, hard max `180 LOC`
- server actions: soft max `120 LOC`, hard max `180 LOC`

## Page and layout rules

- Default to Server Components.
- Use `"use client"` only when the file needs state, effects, browser APIs, or a client-only dependency.
- `page.tsx` should read params/search params, load data, and compose UI.
- `layout.tsx` should stay structural: shells, slots, providers, metadata wiring.
- Do not place provider SDK calls, database queries, or long business workflows directly in pages or layouts.
- If a page grows, split into a route entry plus a route-local shell/presenter or a server query helper.

## Route handler rules

Route handlers should only:

1. authenticate
2. validate
3. delegate
4. map
5. respond

If a route mixes auth, validation, provider orchestration, and business logic, split immediately. Prefer the co-located pattern already used in the repo:

```txt
route.ts
route.schema.ts
route.auth.ts
route.service.ts
route.mapper.ts
```

## Server action rules

- Validate inputs before doing work.
- Delegate business logic to `src/modules/`, `src/server/`, or `src/lib/`.
- Return typed results; do not leak framework or provider internals.
- Keep mutation flows idempotent where duplicate submissions are risky.

## Cache Components rules

Because `cacheComponents: true` is enabled:

- use `"use cache"` for cacheable server subtrees
- attach `cacheTag` and `cacheLife` where invalidation policy is known
- use `revalidateTag` or `updateTag` for explicit invalidation
- stay dynamic only when cookies, headers, per-user state, or truly live data require it

## Metadata rules

- Keep `generateMetadata` cheap and side-effect free.
- Avoid duplicate heavy data fetching between metadata and the page body.

## Delivery checklist

- Pages stay thin and compositional.
- Layouts stay structural.
- Routes only authenticate, validate, delegate, map, and respond.
- Cache behavior is explicit for server-rendered data.
