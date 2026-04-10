# AGENTS.md — Hooks

This file applies to `src/hooks/**`.

## Mission

Hooks encapsulate reusable React state, effects, subscriptions, and client-side data wiring. They must not become hidden service layers.

## File limits

- hook file: soft max `100 LOC`, hard max `150 LOC`

Split immediately if a hook owns multiple async concerns, more than one unrelated state machine, or starts embedding service/business logic.

## Hook rules

- Hooks that use React state/effects or browser APIs must be client-only.
- Do not import server-only code.
- Keep one primary responsibility per hook.
- Return a small, typed API.
- Prefer dedicated query utilities for network work instead of raw `fetch` logic repeated in many hooks.
- Move formatting, normalization, and pure helpers into adjacent utilities when they are not hook-specific.
- Clean up effects, intervals, and subscriptions explicitly.

## Anti-patterns

- large hooks that fetch, transform, cache, and render-view-state all at once
- hooks that know too much about multiple domains
- hooks that mutate external module state implicitly
- hooks that mix persistence, transport, and UI concerns

## Delivery checklist

- Hook API is typed and small.
- Browser-only behavior is isolated cleanly.
- Cleanup logic exists for timers, streams, and subscriptions.
- Complex logic has been split into helpers or multiple hooks.
