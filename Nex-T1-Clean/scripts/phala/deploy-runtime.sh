#!/usr/bin/env bash
set -euo pipefail

# Deploy tee-runtime to Phala Cloud using Phala CLI.
# Requirements: docker, node (or npx), 'phala' CLI (npx phala works), valid API key.

if ! command -v phala >/dev/null 2>&1; then
  echo "phala CLI not found. Installing globally..." >&2
  npm install -g phala >/dev/null 2>&1 || true
fi

if [ $# -lt 1 ] && [ -z "${PHALA_API_KEY:-}" ]; then
  echo "Usage: $0 <PHALA_API_KEY> [vcpu=2] [memory_mb=4096] [disk_gb=10]" >&2
  echo "Or set PHALA_API_KEY in your environment and omit the first argument." >&2
  exit 1
fi

if [ $# -ge 1 ]; then
  PHALA_API_KEY="$1"; shift || true
fi
VCPU="${1:-2}"; shift || true
MEMORY_MB="${1:-4096}"; shift || true
DISK_GB="${1:-10}"; shift || true

TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
IMAGE_LOCAL="agent-runtime:${TAG}"
if [ -n "${DOCKERHUB_USERNAME:-}" ]; then
  IMAGE_REMOTE="docker.io/${DOCKERHUB_USERNAME}/nex-t1-agent-runtime:${TAG}"
else
  IMAGE_REMOTE="$IMAGE_LOCAL"
fi

echo "[1/5] Logging into Phala Cloud..." >&2
phala auth login "$PHALA_API_KEY" >/dev/null

echo "[2/5] Building runtime image: ${IMAGE_LOCAL}" >&2
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

# Prefer linux/amd64 for Phala. On Apple Silicon, force amd64 via buildx.
PLATFORM="linux/amd64"
if ! docker buildx ls >/dev/null 2>&1; then
  docker buildx create --name nex-builder >/dev/null 2>&1 || true
fi
docker buildx use nex-builder >/dev/null 2>&1 || true
docker buildx inspect --bootstrap >/dev/null 2>&1 || true
docker buildx build --platform "$PLATFORM" -t "$IMAGE_LOCAL" tee-runtime --load
if [ "$IMAGE_REMOTE" != "$IMAGE_LOCAL" ]; then
  docker tag "$IMAGE_LOCAL" "$IMAGE_REMOTE"
fi

echo "[3/5] Uploading image to Phala registry..." >&2
if [ -n "${DOCKERHUB_USERNAME:-}" ] && [ -n "${DOCKERHUB_TOKEN:-}" ]; then
  echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin >/dev/null 2>&1 || true
fi

# Attempt non-interactive login; if it still requires input, we'll let the push fail with a helpful message.
phala docker login >/dev/null 2>&1 || true
set +e
PUSH_INPUT_IMAGE="$IMAGE_REMOTE"
PUSH_OUTPUT=$(phala docker push -i "$PUSH_INPUT_IMAGE" 2>&1)
STATUS=$?
set -e
if [ $STATUS -ne 0 ]; then
  echo "$PUSH_OUTPUT" >&2
  echo "Phala docker push failed. Run 'docker login' (Docker Hub) and then 'phala docker login' once interactively, or set DOCKERHUB_USERNAME/DOCKERHUB_TOKEN and retry." >&2
  exit 2
fi
REMOTE_REF=$(echo "$PUSH_OUTPUT" | sed -n 's/^.*Published image reference: \(.*\)$/\1/p')
if [ -z "$REMOTE_REF" ]; then
  # Fallback: assume the input image reference is the remote tag
  REMOTE_REF="$PUSH_INPUT_IMAGE"
fi
echo "Remote image: $REMOTE_REF" >&2

ENV_FILE="tee-runtime/.phala.env"
echo "[4/5] Writing env: ${ENV_FILE}" >&2
mkdir -p tee-runtime
cat > "$ENV_FILE" <<EOF
IMAGE_REF=$REMOTE_REF
EGRESS_ALLOWLIST=${EGRESS_ALLOWLIST:-}
EGRESS_TIMEOUT_MS=10000
MAX_EGRESS_BYTES=1048576
INVOKE_TIMEOUT_MS=30000
SESSION_KEY_HEADER=X-Session-Key
EOF

NAME="nex-agent-runtime-${TAG}"
echo "[5/5] Creating CVM '${NAME}'..." >&2

attempt_create() {
  local _flags="--vcpu $VCPU --memory $MEMORY_MB --disk-size $DISK_GB"
  if phala help 2>/dev/null | grep -q " deploy\b"; then
    phala deploy -f tee-runtime/docker-compose.phala.yml --env-file "$ENV_FILE" -n "$NAME" $_flags 2>&1
    return $?
  fi
  phala cvms create -n "$NAME" -c tee-runtime/docker-compose.phala.yml $_flags --env-file "$ENV_FILE" --debug 2>&1
  return $?
}

ATTEMPTS=${NEX_PHALA_DEPLOY_ATTEMPTS:-20}
SLEEP_SECONDS=${NEX_PHALA_DEPLOY_SLEEP_SECS:-60}

for i in $(seq 1 $ATTEMPTS); do
  echo "Attempt $i/$ATTEMPTS..." >&2
  set +e
  OUTPUT=$(attempt_create)
  STATUS=$?
  set -e
  echo "$OUTPUT" | tail -n 60 >&2

  if [ $STATUS -eq 0 ]; then
    echo "Deployment appears successful." >&2
    echo "Done. Use 'phala cvms list' or 'phala cvms get <id>' to view details." >&2
    exit 0
  fi

  if echo "$OUTPUT" | grep -qi "No TEEPods available"; then
    echo "No capacity available. Retrying in ${SLEEP_SECONDS}s..." >&2
    sleep "$SLEEP_SECONDS"
    continue
  fi

  if echo "$OUTPUT" | grep -Eqi "(invalid|error|failed|unauthori|forbidden|not found)"; then
    echo "Deployment failed with a non-capacity error. Aborting." >&2
    exit 3
  fi

  echo "Indeterminate error. Retrying in ${SLEEP_SECONDS}s..." >&2
  sleep "$SLEEP_SECONDS"
done

echo "Exhausted attempts ($ATTEMPTS). Try again later or target a region/cluster with capacity." >&2
exit 4
