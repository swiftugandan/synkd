#!/usr/bin/env bash
# Stop the local synkd celld container started by celld-dev.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/celld-common.sh
source "$ROOT/scripts/lib/celld-common.sh"

NAME="$CELLD_CONTAINER_NAME"
RUNTIME="$(resolve_container_cli)"

if celld_container_running "$RUNTIME" "$NAME"; then
  echo "==> stopping $NAME"
  "$RUNTIME" rm -f "$NAME" >/dev/null
  echo "Stopped."
else
  echo "No container named $NAME."
fi
