#!/usr/bin/env bash
# Compose wrapper: podman compose / podman-compose / docker compose.
# Examples:
#   ./scripts/compose.sh up -d
#   SYNKD_MINIO=1 ./scripts/compose.sh up -d
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=container-runtime.sh
source "$ROOT/scripts/container-runtime.sh"

COMPOSE="$(resolve_compose_cli)"
cd "$ROOT/deploy"

files=(-f docker-compose.yml)
if [[ "${SYNKD_MINIO:-0}" == "1" ]]; then
  files+=(-f compose.minio.yml)
fi

# shellcheck disable=SC2086
exec $COMPOSE "${files[@]}" "$@"