#!/usr/bin/env bash
# CI / verification: start local celld, probe HTTP + WebSocket, then stop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/celld-common.sh
source "$ROOT/scripts/lib/celld-common.sh"

cleanup() {
  "$ROOT/scripts/celld-stop.sh" >/dev/null 2>&1 || true
}
trap cleanup EXIT

"$ROOT/scripts/celld-dev.sh" "$@"
echo
echo "celld smoke OK (HTTP + WebSocket). Container will be stopped."
