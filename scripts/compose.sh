#!/usr/bin/env bash
# Compose wrapper: podman compose / podman-compose / docker compose.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=container-runtime.sh
source "$ROOT/scripts/container-runtime.sh"

COMPOSE="$(resolve_compose_cli)"
cd "$ROOT/deploy"

# shellcheck disable=SC2086
exec $COMPOSE -f docker-compose.yml "$@"