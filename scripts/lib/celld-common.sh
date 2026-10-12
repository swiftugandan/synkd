#!/usr/bin/env bash
# Shared helpers for local celld and fleet deploy scripts.
# shellcheck shell=bash

: "${ROOT:?ROOT must be set before sourcing celld-common.sh}"

# shellcheck source=../container-runtime.sh
source "$ROOT/scripts/container-runtime.sh"

CELLD_IMAGE="${CELLD_IMAGE:-ghcr.io/denoland/celld:latest}"
CELLD_NODE_IMAGE="${CELLD_NODE_IMAGE:-docker.io/library/node:22-bookworm}"
CELLD_CONTAINER_NAME="${CELLD_CONTAINER_NAME:-synkd-celld-dev}"
CELLD_DEV_PORT="${CELLD_DEV_PORT:-9876}"
ESBUILD_LINUX="${ESBUILD_LINUX:-$ROOT/.synkd/bin/esbuild-linux}"

# Project containing synkd.json + wrangler.jsonc + src/worker.ts
celld_project_dir() {
  local dir
  if [[ -n "${CELLD_PROJECT:-}" ]]; then
    dir="$CELLD_PROJECT"
  elif [[ $# -ge 1 && -n "${1:-}" ]]; then
    dir="$1"
  else
    dir="$ROOT/apps/parties"
  fi
  (cd "$dir" && pwd)
}

# Mount the monorepo root so workspace packages and .synkd/bin resolve.
celld_volume_opts() {
  local opts="${ROOT}:/workspace"
  if [[ "$(uname -s)" == "Linux" ]]; then
    opts="${opts}:Z"
  fi
  echo "$opts"
}

celld_container_running() {
  local runtime="$1"
  local name="$2"
  "$runtime" inspect "$name" >/dev/null 2>&1
}

celld_ensure_linux_esbuild() {
  local runtime="$1"
  mkdir -p "$(dirname "$ESBUILD_LINUX")"
  if [[ -x "$ESBUILD_LINUX" ]]; then
    echo "==> linux esbuild cached at $ESBUILD_LINUX"
    return
  fi
  echo "==> fetching linux esbuild via $CELLD_NODE_IMAGE"
  "$runtime" run --rm \
    -v "$(dirname "$ESBUILD_LINUX"):/out" \
    -e NPM_CONFIG_UPDATE_NOTIFIER=false \
    "$CELLD_NODE_IMAGE" \
    bash -lc 'npm install -g esbuild@0.28.2 >/dev/null && cp "$(which esbuild)" /out/esbuild-linux && chmod +x /out/esbuild-linux'
}

celld_prepare_project() {
  local project="$1"
  local config="$project/synkd.json"
  if [[ ! -f "$config" ]]; then
    echo "Missing $config — run: synkd init" >&2
    return 1
  fi
  echo "==> generate wrangler.jsonc from synkd.json"
  cd "$ROOT"
  pnpm --filter @synkd/cli exec tsx src/bin.ts deploy --config "$config"
  pnpm --filter @synkd/adapter-celld --filter @synkd/auth --filter @synkd/server --filter @synkd/contracts run build
}

celld_guest_token() {
  local project="$1"
  local token="dev-token"
  if command -v node >/dev/null 2>&1 && [[ -f "$project/synkd.json" ]]; then
    token="$(
      node -e 'const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write((c.auth&&c.auth.token)||"dev-token")' \
        "$project/synkd.json" 2>/dev/null || echo "dev-token"
    )"
  fi
  echo "$token"
}

celld_wait_ready() {
  local runtime="$1"
  local cid="$2"
  local port="$3"
  local token="$4"
  local probe="http://127.0.0.1:${port}/parties/main/healthz?token=${token}"
  local ok=0
  echo "==> waiting for celld on :${port}"
  for _ in $(seq 1 60); do
    if curl -sf "$probe" >/dev/null 2>&1; then
      ok=1
      break
    fi
    if "$runtime" logs "$cid" 2>&1 | grep -qiE 'listening|9876|ready'; then
      sleep 1
      if curl -sf "$probe" >/dev/null 2>&1; then
        ok=1
        break
      fi
    fi
    sleep 0.5
  done
  if [[ "$ok" -ne 1 ]]; then
    echo "celld did not become ready on :${port}" >&2
    "$runtime" logs --tail 100 "$cid" || true
    return 1
  fi
}

celld_probe() {
  local port="$1"
  local token="$2"
  local room="${3:-healthz}"
  echo "==> HTTP party probe"
  curl -si "http://127.0.0.1:${port}/parties/main/${room}?token=${token}" | head -40
  echo "==> Durable Object capability probe"
  local caps
  caps="$(curl -sf "http://127.0.0.1:${port}/parties/main/${room}?token=${token}&synkd_caps=1" || true)"
  if [[ -n "$caps" ]]; then
    echo "$caps"
    mkdir -p "$ROOT/.synkd"
    printf '%s\n' "$caps" > "$ROOT/.synkd/celld-caps.json"
  else
    echo "caps probe failed (non-fatal)"
  fi
  echo "==> WebSocket broadcast probe"
  cd "$ROOT"
  pnpm --filter @synkd/runtime exec node ./scripts/ws-smoke.mjs "http://127.0.0.1:${port}"
}
