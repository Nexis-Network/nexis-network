# AGENTS.md — Domain Modules

This file applies to `src/modules/**`.

More specific module docs under `src/modules/agents/`, `src/modules/markets/`, and `src/modules/wallet/` override this file.

## Mission

`src/modules/` owns domain logic, feature-local services, workflows, schemas, and module-scoped UI/hooks.

## Recommended structure

```txt
src/modules/<domain>/
  components/
  hooks/
  services/
  workflows/
  schemas/
  types/
  utils/
  server/
  tests/
```

## File limits

- React component: soft max `180 LOC`, hard max `250 LOC`
- hook: soft max `100 LOC`, hard max `150 LOC`
- utility: soft max `120 LOC`, hard max `180 LOC`
- service: soft max `180 LOC`, hard max `250 LOC`
- workflow: soft max `180 LOC`, hard max `250 LOC`
- schema: soft max `180 LOC`, hard max `300 LOC`
- AI tool: soft max `150 LOC`, hard max `220 LOC`

## Module rules

- Keep each module centered on one domain.
- Use services for domain operations, workflows for multi-step orchestration, schemas for boundary validation, and utils for pure helpers.
- Do not put route handlers or page files in modules.
- Do not place raw database access or provider bootstrapping in random module files when a shared adapter already exists in `src/server/` or `src/lib/`.
- If code is reused across multiple domains, move it to `src/lib/`.
- Avoid cross-module cycles. If two modules depend on each other, extract the shared contract.

## Split triggers

Split when:

- a service starts handling unrelated domain operations
- a workflow spans multiple domains without a clear orchestrator boundary
- a hook begins doing transport and business logic together
- a component carries data loading, business rules, and heavy UI state together

## Testing

- Add targeted tests for new domain behavior.
- Favor module-local test coverage over only route-level coverage.
