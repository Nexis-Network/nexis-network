# AGENTS.md — Server Layer

This file applies to `src/server/**`.

## Mission

`src/server/` owns server-only orchestration, repositories, provider clients, queue helpers, and privileged actions.

## File limits

- utility: soft max `120 LOC`, hard max `180 LOC`
- service: soft max `180 LOC`, hard max `250 LOC`
- workflow/orchestrator: soft max `180 LOC`, hard max `250 LOC`
- schema: soft max `180 LOC`, hard max `300 LOC`

## Server rules

- Keep this layer server-only. Use `import "server-only"` where appropriate for privileged modules.
- No React components or client hooks belong here.
- Services should own one domain or one integration.
- Repositories should focus on persistence, not business orchestration.
- Provider wrappers must set timeouts, normalize errors, and avoid leaking raw SDK responses upward.
- Mutating flows should account for auth, authorization, rate limiting, idempotency, and audit logging where relevant.
- Never log secrets, raw tokens, private keys, or sensitive financial payloads.

## Layering

- `src/app` delegates into this layer for privileged work.
- `src/modules` may use this layer for server-side orchestration where that boundary is already established.
- `src/server/actions` should stay thin and call deeper services instead of accumulating domain logic inline.

## Split triggers

Split immediately if a server file:

- mixes unrelated providers or domains
- combines validation, persistence, and orchestration in one large function
- grows beyond `250 LOC`
- becomes both a repository and a business service

## Delivery checklist

- Server-only boundaries remain intact.
- Error handling is typed and sanitized.
- External calls have timeout and retry behavior where needed.
- Mutations are safe to retry or explicitly protected against duplicates.
