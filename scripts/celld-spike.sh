#!/usr/bin/env bash
# Spike: deploy apps/parties to celld via Docker and hit /health + a party room.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${CELLD_IMAGE:-ghcr.io/denoland/celld:latest}"
PARTY_DIR="$ROOT/apps/parties"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not installed" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

echo "==> celld version"
docker run --rm "$IMAGE" --version

echo "==> generate wrangler from sinkd.json (host tooling)"
cd "$ROOT"
pnpm --filter @sinkd/cli exec tsx src/bin.ts deploy --config "$PARTY_DIR/sinkd.json"

echo "==> celld deploy (container)"
docker run --rm \
  -v "$PARTY_DIR":/app \
  -w /app \
  "$IMAGE" \
  deploy .

echo "Spike packaged. Start a fleet with deploy/docker-compose.yml and CELLD_BUCKET set."
echo "Then: curl -i https://\$HOST/parties/main/spike"