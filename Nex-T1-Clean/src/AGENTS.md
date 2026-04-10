# AGENTS.md — Source Tree

This file applies to `src/**`.

## Purpose

`src/` contains the production Next.js application and its supporting server and domain layers.

## Source boundaries

- `src/app/` owns route entries, layouts, route handlers, metadata, and server actions.
- `src/components/` owns presentation and view composition.
- `src/hooks/` owns reusable React hooks.
- `src/modules/` owns domain logic.
- `src/server/` owns server-only orchestration, repositories, and provider integrations.
- `src/lib/` owns shared cross-domain infrastructure and utilities.
- `src/config/env/` owns environment parsing and validation.
- `src/types/` owns shared contracts when they are not module-local.

## Import rules

- Client code must not import server-only code from `src/server/` or privileged server helpers in `src/lib/`.
- Server code must not import client-only components or browser-only hooks.
- Cross-domain logic used by multiple modules belongs in `src/lib/`.
- Domain-specific logic stays in `src/modules/`, not `src/lib/`.
- App entries should delegate to `src/modules/`, `src/server/`, and `src/lib/` instead of inlining orchestration.

## Quality rules

- Exported functions should declare explicit return types.
- Validate untrusted input at the boundary.
- Prefer small, named modules over large barrel files that hide ownership.
- When touching a legacy oversized file, do not add a new responsibility to it. Extract first or as part of the change.
- Check file size with `wc -l <path>` when a file is close to the policy limit.

## Cache Components

`cacheComponents: true` is enabled globally. For cacheable server-side work under `src/`, prefer Cache Components patterns over ad hoc memoization or route-level overfetching.

## Validation

- Run targeted tests for the touched subtree.
- Run `pnpm lint` and `pnpm typecheck` for changes that cross module boundaries or affect shared code.
