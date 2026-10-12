#!/usr/bin/env bash
# Run the party project under a local celld node (Durable Objects on your machine).
# Uses Podman when available, otherwise Docker. Keeps the container running.
#
# Usage:
#   pnpm celld:dev
#   CELLD_PROJECT=./my-rooms ./scripts/celld-dev.sh
#   ./scripts/celld-dev.sh /path/to/project
#
# Stop with: pnpm celld:stop
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/celld-common.sh
source "$ROOT/scripts/lib/celld-common.sh"

PROJECT="$(celld_project_dir "${1:-}")"
PORT="$CELLD_DEV_PORT"
RUNTIME="$(resolve_container_cli)"
TOKEN="$(celld_guest_token "$PROJECT")"
NAME="$CELLD_CONTAINER_NAME"

echo "==> container runtime: $RUNTIME"
echo "==> project: $PROJECT"
echo "==> celld image: $CELLD_IMAGE"
"$RUNTIME" run --rm "$CELLD_IMAGE" --version

celld_prepare_project "$PROJECT"
celld_ensure_linux_esbuild "$RUNTIME"

# Replace any previous local node
if celld_container_running "$RUNTIME" "$NAME"; then
  echo "==> removing existing container $NAME"
  "$RUNTIME" rm -f "$NAME" >/dev/null 2>&1 || true
fi

VOLUME_OPTS="$(celld_volume_opts)"
# Mount the whole repo so workspace packages resolve; workdir is the party project.
WORKDIR="/workspace/${PROJECT#"$ROOT"/}"

echo "==> starting celld on 0.0.0.0:${PORT} (container $NAME)"
"$RUNTIME" run -d \
  --name "$NAME" \
  -v "$VOLUME_OPTS" \
  -e CELLD_ESBUILD=/workspace/.synkd/bin/esbuild-linux \
  -p "${PORT}:9876" \
  -w "$WORKDIR" \
  "$CELLD_IMAGE" \
  dev . --host 0.0.0.0 --port 9876 --logs

CID="$("$RUNTIME" inspect -f '{{.Id}}' "$NAME")"
celld_wait_ready "$RUNTIME" "$CID" "$PORT" "$TOKEN"
"$RUNTIME" logs --tail 40 "$NAME" || true
celld_probe "$PORT" "$TOKEN"

cat <<EOF

celld is running (local Durable Object host).

  Party URL:  http://127.0.0.1:${PORT}/parties/main/<room>?token=${TOKEN}
  Studio:     http://127.0.0.1:5173/?backend=celld
  Caps file:  $ROOT/.synkd/celld-caps.json
  Logs:       $RUNTIME logs -f $NAME
  Stop:       pnpm celld:stop

What is celld? Open-source Workers + Durable Objects runtime
(https://celld.dev). synkd parties run on Node for daily DX, or on
celld when you need Durable Object storage / multi-node fleets.
EOF

if [[ "${CELLD_ATTACH:-0}" == "1" ]]; then
  echo "==> attaching logs (Ctrl+C detaches; container keeps running)"
  "$RUNTIME" logs -f "$NAME"
fi
