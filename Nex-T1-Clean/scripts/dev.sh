#!/usr/bin/env bash
set -euo pipefail

# Increase the file-descriptor limit when it is too low to satisfy Watchpack/fs watchers
# (common on macOS where the default soft limit is 256). If we cannot raise the
# limit, fall back to polling to avoid EMFILE errors.

TARGET_NOFILE=${TARGET_NOFILE:-65536}
MIN_POLL_THRESHOLD=${MIN_POLL_THRESHOLD:-4096}
FORCE_POLLING=${FORCE_POLLING:-${WATCHPACK_FORCE_POLLING:-false}}
# Default to polling unless explicitly disabled; reduces watcher FD pressure (EMFILE)
DEFAULT_POLLING=${DEFAULT_POLLING:-${WATCHPACK_DEFAULT_POLLING:-true}}

current_limit=$(ulimit -n 2>/dev/null || echo 0)

if [[ "$current_limit" =~ ^[0-9]+$ ]] && (( current_limit < TARGET_NOFILE )); then
  # macOS often allows raising within the user hard limit; on Linux this might be
  # constrained by /proc/sys/fs/file-max.
  ulimit -n "$TARGET_NOFILE" 2>/dev/null || true
  current_limit=$(ulimit -n 2>/dev/null || echo "$current_limit")
fi

if ! [[ "$current_limit" =~ ^[0-9]+$ ]]; then
  current_limit=0
fi

should_poll=$DEFAULT_POLLING
if [[ "$FORCE_POLLING" =~ ^(1|true|yes|on)$ ]]; then
  should_poll=true
fi

# If limit is clearly low, force polling regardless of defaults
if (( current_limit < MIN_POLL_THRESHOLD )); then
  should_poll=true
fi

if [[ "$should_poll" =~ ^(1|true|yes|on)$ ]]; then
  export WATCHPACK_POLLING=${WATCHPACK_POLLING:-true}
  export WATCHPACK_POLL_INTERVAL=${WATCHPACK_POLL_INTERVAL:-750}
  export CHOKIDAR_USEPOLLING=${CHOKIDAR_USEPOLLING:-true}
  echo "[dev] polling watcher enabled (interval=${WATCHPACK_POLL_INTERVAL}ms)" >&2
fi

DEV_BUNDLER=${NEXT_DEV_BUNDLER:-turbopack}
export NEXT_DIST_DIR=${NEXT_DIST_DIR:-.next-dev}

DEV_PORT=${PORT:-3000}
if lsof -i ":$DEV_PORT" -t >/dev/null 2>&1; then
  echo "[dev] ERROR: port $DEV_PORT is already in use" >&2
  exit 1
fi

# Handle stale Next.js dev lock files in custom dist dirs (e.g. .next-dev).
# If a lock exists and no process owns it, remove it so `pnpm dev` can recover
# after crashes or interrupted sessions.
LOCK_FILE="${NEXT_DIST_DIR}/dev/lock"
if [[ -f "$LOCK_FILE" ]]; then
  lock_pid=""
  if command -v lsof >/dev/null 2>&1; then
    lock_pid=$(lsof -t "$LOCK_FILE" 2>/dev/null | head -n 1 || true)
  fi

  if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
    lock_cmd=$(ps -p "$lock_pid" -o command= 2>/dev/null || true)
    echo "[dev] lock file in use: ${LOCK_FILE}" >&2
    echo "[dev] active Next.js dev process detected (pid=${lock_pid})" >&2
    if [[ -n "$lock_cmd" ]]; then
      echo "[dev] command: ${lock_cmd}" >&2
    fi
    echo "[dev] stop that process first, or use the existing dev server." >&2
    exit 1
  fi

  echo "[dev] removing stale lock: ${LOCK_FILE}" >&2
  rm -f "$LOCK_FILE"
fi

next_args=(dev)
if [[ "$DEV_BUNDLER" == "webpack" ]]; then
  next_args+=(--webpack)
  echo "[dev] bundler=webpack (set NEXT_DEV_BUNDLER=turbopack to re-enable Turbopack)" >&2
elif [[ "$DEV_BUNDLER" == "turbopack" ]]; then
  echo "[dev] bundler=turbopack" >&2
else
  echo "[dev] unknown NEXT_DEV_BUNDLER=${DEV_BUNDLER}, defaulting to webpack" >&2
  next_args+=(--webpack)
fi

if command -v pnpm >/dev/null 2>&1; then
  pnpm exec next "${next_args[@]}" "$@"
elif [[ -x "./node_modules/.bin/next" ]]; then
  ./node_modules/.bin/next "${next_args[@]}" "$@"
else
  echo "[dev] Could not find Next.js CLI. Run 'pnpm install' first." >&2
  exit 1
fi
