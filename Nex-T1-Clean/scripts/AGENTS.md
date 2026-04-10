# AGENTS.md — Scripts

This file applies to `scripts/**`.

## Mission

Scripts are operational tooling for quality checks, backfills, perf analysis, environment checks, and maintenance tasks.

## File limits

- script file: soft max `120 LOC`, hard max `180 LOC`

Split large scripts into helpers or subcommands when they cross the soft limit.

## Script rules

- One script should do one job well.
- Prefer safe defaults and `--dry-run` for mutating or destructive operations.
- Document required environment variables at the top of the script or in adjacent docs.
- Exit non-zero on failure.
- Keep logging concise and never print secrets.
- Do not embed application business logic here if it belongs in `src/server/`, `src/modules/`, or `src/lib/`.

## Structure

- `scripts/quality/`: static enforcement and guard scripts
- `scripts/perf/`: perf and bundle tooling
- `scripts/db/`, `scripts/supabase/`, `scripts/redis/`: operational data/platform work
- `scripts/launchpad/`, `scripts/phala/`, `scripts/sqs/`: domain-specific ops helpers

## Validation

- Test critical scripts with the narrowest realistic invocation.
- For scripts that change remote state or data, prefer dry-run verification first.
