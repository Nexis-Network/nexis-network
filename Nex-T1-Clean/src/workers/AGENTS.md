# AGENTS.md — Workers

This file applies to `src/workers/**`.

## Mission

Worker files are entrypoints for background processing. They should bootstrap, delegate, and supervise, not hold domain logic.

## File limits

- worker entrypoint: soft max `120 LOC`, hard max `180 LOC`
- delegated workflow file: soft max `180 LOC`, hard max `250 LOC`

## Worker rules

- Keep each worker entrypoint responsible for one runtime or queue.
- Parse config, initialize logging, attach shutdown handling, and delegate the real work.
- Put business logic in `src/server/` or `src/modules/`.
- Make retries and replays safe. Background work should be idempotent or explicitly deduplicated.
- Log job identity, status, and failure context without leaking secrets or sensitive payloads.

## Split triggers

Split immediately if a worker file starts owning:

- queue bootstrap and business logic
- multiple unrelated job types
- provider-specific logic plus domain orchestration

## Validation

- Prefer targeted tests around the delegated processor logic.
- For worker entrypoint changes, verify startup and shutdown paths explicitly.
