#!/usr/bin/env bash
# Spike: run apps/parties under celld via podman (preferred) or docker.
# Uses `celld dev` (local filesystem state). Set CELLD_BUCKET to exercise `celld deploy`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=container-runtime.sh
source "$ROOT/scripts/container-runtime.sh"

IMAGE="${CELLD_IMAGE:-ghcr.io/denoland/celld:latest}"
NODE_IMAGE="${CELLD_NODE_IMAGE:-docker.io/library/node:22-bookworm}"
PARTY_DIR="$ROOT/apps/parties"
ESBUILD_LINUX="$ROOT/.sinkd/bin/esbuild-linux"
PORT="${CELLD_DEV_PORT:-9876}"
RUNTIME="$(resolve_container_cli)"

mkdir -p "$ROOT/.sinkd/bin"

echo "==> container runtime: $RUNTIME"
echo "==> celld version"
"$RUNTIME" run --rm "$IMAGE" --version

echo "==> generate wrangler from sinkd.json"
cd "$ROOT"
pnpm --filter @sinkd/cli exec tsx src/bin.ts deploy --config "$PARTY_DIR/sinkd.json"
pnpm --filter @sinkd/adapter-celld --filter @sinkd/auth --filter @sinkd/server --filter @sinkd/contracts run build

ensure_linux_esbuild() {
  if [[ -x "$ESBUILD_LINUX" ]]; then
    echo "==> linux esbuild cached at $ESBUILD_LINUX"
    return
  fi
  echo "==> fetching linux esbuild via $NODE_IMAGE"
  "$RUNTIME" run --rm \
    -v "$ROOT/.sinkd/bin:/out" \
    -e NPM_CONFIG_UPDATE_NOTIFIER=false \
    "$NODE_IMAGE" \
    bash -lc 'npm install -g esbuild@0.28.2 >/dev/null && cp "$(which esbuild)" /out/esbuild-linux && chmod +x /out/esbuild-linux'
}

ensure_linux_esbuild

VOLUME_OPTS="$ROOT:/workspace"
if [[ "$(uname -s)" == "Linux" ]]; then
  VOLUME_OPTS="$VOLUME_OPTS:Z"
fi

if [[ -n "${CELLD_BUCKET:-}" ]]; then
  echo "==> celld deploy to $CELLD_BUCKET"
  "$RUNTIME" run --rm \
    -v "$VOLUME_OPTS" \
    -e "CELLD_BUCKET=$CELLD_BUCKET" \
    -e "AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}" \
    -e "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}" \
    -e "AWS_REGION=${AWS_REGION:-auto}" \
    -e "S3_ENDPOINT=${S3_ENDPOINT:-}" \
    -e "CELLD_ESBUILD=/workspace/.sinkd/bin/esbuild-linux" \
    -w /workspace/apps/parties \
    "$IMAGE" \
    deploy . --bucket "$CELLD_BUCKET"
  echo "Deployed. Start fleet with: ./scripts/compose.sh up -d"
  exit 0
fi

echo "==> celld dev on 0.0.0.0:${PORT} (Ctrl+C to stop after smoke, or SINKD_SPIKE_KEEP=1)"
CID_FILE="$(mktemp)"
"$RUNTIME" run -d \
  --cidfile "$CID_FILE" \
  -v "$VOLUME_OPTS" \
  -e CELLD_ESBUILD=/workspace/.sinkd/bin/esbuild-linux \
  -p "${PORT}:9876" \
  -w /workspace/apps/parties \
  "$IMAGE" \
  dev . --host 0.0.0.0 --port 9876 --logs

CID="$(cat "$CID_FILE")"
rm -f "$CID_FILE"

cleanup() {
  if [[ "${SINKD_SPIKE_KEEP:-0}" != "1" ]]; then
    "$RUNTIME" rm -f "$CID" >/dev/null 2>&1 || true
  else
    echo "Leaving container $CID running (SINKD_SPIKE_KEEP=1)"
  fi
}
trap cleanup EXIT

echo "==> waiting for listener"
ok=0
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null 2>&1 \
    || curl -sf "http://127.0.0.1:${PORT}/parties/main/spike?token=dev-token" >/dev/null 2>&1; then
    ok=1
    break
  fi
  # still starting if logs show listen
  if "$RUNTIME" logs "$CID" 2>&1 | grep -qiE 'listening|9876|ready'; then
    sleep 1
    if curl -sf "http://127.0.0.1:${PORT}/parties/main/spike?token=dev-token" >/dev/null 2>&1; then
      ok=1
      break
    fi
  fi
  sleep 0.5
done

echo "==> container logs (tail)"
"$RUNTIME" logs --tail 80 "$CID" || true

if [[ "$ok" -ne 1 ]]; then
  echo "celld dev did not become ready on :${PORT}" >&2
  exit 1
fi

echo "==> HTTP party probe"
curl -si "http://127.0.0.1:${PORT}/parties/main/spike?token=dev-token" | head -40

echo "==> DO capability probe (hibernation / getTags)"
CAPS_JSON="$(curl -sf "http://127.0.0.1:${PORT}/parties/main/spike?token=dev-token&sinkd_caps=1" || true)"
if [[ -n "$CAPS_JSON" ]]; then
  echo "$CAPS_JSON"
  mkdir -p "$ROOT/.sinkd"
  printf '%s\n' "$CAPS_JSON" > "$ROOT/.sinkd/celld-caps.json"
else
  echo "caps probe failed (non-fatal)"
fi

echo "==> WebSocket broadcast probe"
cd "$ROOT"
pnpm --filter @sinkd/runtime exec node ./scripts/ws-smoke.mjs "http://127.0.0.1:${PORT}"

echo
echo "Spike OK via $RUNTIME (HTTP + WebSocket)."
echo "Party URL: http://127.0.0.1:${PORT}/parties/main/<room>?token=dev-token"
echo "Caps file: $ROOT/.sinkd/celld-caps.json"
echo "Keep running: SINKD_SPIKE_KEEP=1 pnpm celld:spike"