# AGENTS.md — Agents Module

This file applies to all files under `src/modules/agents/`.

It extends the root `AGENTS.md` with domain-specific rules for agent orchestration, tool definition, workflow composition, and AI agent safety.

---

# Scope and Precedence

- This file applies to `src/modules/agents/**`.
- The root `AGENTS.md` still applies unless this file is more specific.
- Direct human instructions take precedence.
- If a requested implementation conflicts with this file, refactor the design before coding.

---

# Module Mission

The Agents module owns:
- Agent definitions, capability manifests, and persona configs
- Tool schemas, tool executors, and tool guardrails
- Agent orchestration workflows and multi-agent routing
- Agent memory interfaces and state management delegates
- Agent evaluation, scoring, and safety policies

The Agents module does NOT own:
- Raw database access (delegate to `src/lib/db`)
- HTTP transport (delegate to `src/app/api/agents/`)
- Auth/session management (delegate to `src/lib/auth`)
- Market data fetching (delegate to `src/modules/markets/` or `src/lib/birdeye/`, `src/lib/market-overview/`)
- Wallet operations (delegate to `src/modules/wallet/` or `src/lib/wallets/`)

---

# Directory Structure

```txt
src/modules/agents/
  components/       # Agent-specific UI components (client-only where needed)
  hooks/            # Agent-specific React hooks
  server/           # Server-only agent data fetching and rendering support
  services/         # Agent CRUD, capability queries, agent config services
  workflows/        # Multi-step agent orchestration workflows
  tools/            # AI tool definitions (schema + executor + guardrails)
  schemas/          # Zod validation schemas for agent configs and tool inputs/outputs
  types/            # TypeScript types, interfaces, and domain DTOs
  utils/            # Pure utility functions for agent-domain logic
  tests/            # Unit and integration tests for this module
```

---

# File and Function Limits

Inherited from root `AGENTS.md`:
- Service file: soft max `180 LOC`, hard max `250 LOC`
- Workflow file: soft max `180 LOC`, hard max `250 LOC`
- AI tool file: soft max `150 LOC`, hard max `220 LOC`
- Schema/validator file: soft max `180 LOC`, hard max `300 LOC`

Additional enforcement:
- Tool executor files (`tool.execute.ts`): hard max `150 LOC`
- Tool schema files (`tool.schema.ts`): hard max `180 LOC`
- Workflow orchestration files: hard max `250 LOC` — split into `workflow.steps.ts` if nearing limit

---

# Tool Definition Rules

Every AI tool in this module must:

1. Define schema in `tool.schema.ts` using Zod — never inline schemas in executors
2. Implement execution logic in `tool.execute.ts` — single responsibility
3. Define guardrails in `tool.guardrails.ts` — input validation, output sanitization, risk flags
4. Export a typed tool definition object from `tool.ts`
5. Never perform auth directly — tools receive pre-validated, pre-authorized context

Tool files must follow the pattern:
```txt
tools/[tool-name]/
  tool.ts
  tool.schema.ts
  tool.execute.ts
  tool.guardrails.ts
  tool.types.ts
```

Tool executors must:
- Be async and return typed results
- Handle provider errors gracefully and map to typed error objects
- Never throw unhandled exceptions
- Log execution metadata (not sensitive inputs/outputs) for observability
- Respect timeout bounds — never block indefinitely on external calls

---

# Workflow Rules

Agent workflows compose tools and services into multi-step operations.

Workflow files must:
- Define clear step boundaries in `workflow.steps.ts`
- Define policies (retry, fallback, circuit-break) in `workflow.policy.ts`
- Define telemetry hooks in `workflow.telemetry.ts`
- Define types in `workflow.types.ts`
- Orchestrate from `workflow.ts` without containing raw business logic

Workflows must NOT:
- Contain raw SQL or direct DB calls — delegate to services
- Contain raw HTTP calls — delegate to lib integrations
- Mix multiple unrelated domain outcomes in a single workflow

---

# Agent Safety Rules

- All tool inputs must be validated against Zod schemas before execution.
- All tool outputs must be sanitized before returning to the agent loop.
- Guardrail checks must run before expensive, destructive, or external operations.
- Never expose raw model errors or provider stack traces through tool results.
- Rate-limit tool executions that call external providers.
- Financial or wallet-adjacent tools must require explicit user confirmation; never auto-execute transactions silently.
- Sensitive inputs (keys, secrets, PII) must never appear in tool execution logs.
- Tool executors must enforce timeout bounds; use `AbortSignal` or equivalent for cancellation.

---

# Memory and State Rules

- Agent memory interfaces live in `src/modules/agents/services/` or delegate to `src/lib/memory/`.
- Do not duplicate memory logic; use the unified memory provider.
- Memory reads and writes must be scoped to the user/tenant; never share memory across users.
- Conversation context must be bounded — implement context window management.
- Persist agent state to Supabase via the db lib; do not store long-term state in process memory.

---

# Multi-Agent Routing Rules

- Routing logic must live in `src/modules/agents/workflows/` or `src/lib/` routing helpers.
- Agent routing decisions must be logged for observability.
- Handoff between agents must preserve typed context objects — no untyped passthrough.
- Routing policy must be testable in isolation from provider calls.

---

# Caching Rules

- Agent configs and capability manifests: cache aggressively with long TTL, tag by agent ID.
- Tool metadata: cache with medium TTL; invalidate on tool version change.
- Conversation context: user-scoped; do not cache across users; short TTL or session-scoped only.
- Tool results: cache only if deterministic and input-hashable; key by normalized input + tool version + user scope.
- Never cache sensitive outputs, PII, or financial data.

---

# Testing Requirements

- Every tool executor must have at least one unit test covering happy path and error case.
- Workflow steps must have unit tests for each step boundary.
- Integration tests must cover end-to-end tool execution with a mocked external provider.
- Guardrail logic must be independently tested with boundary inputs.

---

# Delivery Checklist (Agents Module)

Before submitting any change to this module:

1. Tool schema defined in `tool.schema.ts` with full Zod validation
2. Tool executor in `tool.execute.ts` — single responsibility, typed return
3. Guardrails defined and tested
4. Workflow steps clearly separated from orchestration
5. Memory operations are user-scoped
6. No raw SQL or provider SDK calls in workflow or tool files
7. Safety rules verified: rate limiting, timeout bounds, no secret leakage
8. Run: `pnpm run lint && pnpm run typecheck`
9. Run targeted tests: `pnpm run test -- src/modules/agents`
