# AGENTS.md — Components

This file applies to `src/components/**`.

## Mission

Components are for presentation and view composition. They should not become a second service layer.

## File limits

- React component: soft max `180 LOC`, hard max `250 LOC`

Split immediately if a component exceeds 3 responsibilities or crosses `250 LOC`.

## Component rules

- Prefer server-rendered components when interactivity is not required.
- Add `"use client"` only when the component needs state, effects, event handlers, browser APIs, or a client-only dependency.
- Keep components focused on rendering, local interaction, and UI state.
- Move data loading, provider orchestration, and domain logic into `src/app/`, `src/modules/`, `src/server/`, or hooks.
- Avoid direct imports from `src/server/`.
- Keep prop shapes explicit and typed. Large prop bags are a split signal.
- Avoid boolean-flag prop explosions. Prefer variants, composition, or dedicated components.

## Split patterns

When a component grows, split into:

- a parent container and small presentational children
- a dedicated hook for UI state
- a module/local utility for formatting or data shaping

## Styling rules

- Reuse established tokens, utilities, and UI primitives already present in the repo.
- Keep layout and visual logic readable; avoid giant inline class computations.
- Do not introduce one-off visual systems that conflict with the current route or product surface.

## Testing

- Add or update tests for interactive components, branching render logic, or bug fixes.
- Prefer behavior assertions over broad snapshots.
