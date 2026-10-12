#!/usr/bin/env bash
# Bring up MinIO via Podman compose and `celld deploy` against it.
# MinIO is NOT celld-qualified for production fleets — this proves the wiring.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=container-runtime.sh
source "$ROOT/scripts/container-runtime.sh"

RUNTIME="$(resolve_container_cli)"
IMAGE="${CELLD_IMAGE:-ghcr.io/denoland/celld:latest}"
ESBUILD_LINUX="$ROOT/.sinkd/bin/esbuild-linux"
PARTY_DIR="$ROOT/apps/parties"
NETWORK="${SINKD_COMPOSE_NETWORK:-deploy_sinkd}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-sinkd}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-sinkdsecret}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export CELLD_BUCKET="${CELLD_BUCKET:-s3://sinkd-cells}"

echo "==> container runtime: $RUNTIME"
echo "==> starting MinIO overlay"
SINKD_MINIO=1 "$ROOT/scripts/compose.sh" up -d minio minio-init

echo "==> waiting for MinIO on :9000"
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:9000/minio/health/live" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
curl -sf "http://127.0.0.1:9000/minio/health/live" >/dev/null

mkdir -p "$ROOT/.sinkd/bin"
if [[ ! -x "$ESBUILD_LINUX" ]]; then
  echo "==> fetching linux esbuild"
  "$RUNTIME" run --rm \
    -v "$ROOT/.sinkd/bin:/out" \
    docker.io/library/node:22-bookworm \
    bash -lc 'npm install -g esbuild@0.28.2 >/dev/null && cp "$(which esbuild)" /out/esbuild-linux && chmod +x /out/esbuild-linux'
fi

cd "$ROOT"
pnpm --filter @sinkd/cli exec tsx src/bin.ts deploy --config "$PARTY_DIR/sinkd.json"
pnpm --filter @sinkd/adapter-celld --filter @sinkd/auth --filter @sinkd/server --filter @sinkd/contracts run build

VOLUME_OPTS="$ROOT:/workspace"
if [[ "$(uname -s)" == "Linux" ]]; then
  VOLUME_OPTS="$VOLUME_OPTS:Z"
fi

echo "==> celld deploy --dry-run (bundle proof)"
"$RUNTIME" run --rm \
  -v "$VOLUME_OPTS" \
  -e "CELLD_ESBUILD=/workspace/.sinkd/bin/esbuild-linux" \
  -w /workspace/apps/parties \
  "$IMAGE" \
  deploy . --bucket "$CELLD_BUCKET" --endpoint http://minio:9000 --region "$AWS_REGION" --dry-run

echo "==> ensuring MinIO bucket exists on compose network"
"$RUNTIME" run --rm --network "$NETWORK" --entrypoint /bin/sh \
  docker.io/minio/mc:latest \
  -c "mc alias set local http://minio:9000 '${AWS_ACCESS_KEY_ID}' '${AWS_SECRET_ACCESS_KEY}' && mc mb --ignore-existing local/sinkd-cells && mc ls local"

echo "==> celld deploy to MinIO via compose network (experimental)"
set +e
"$RUNTIME" run --rm \
  --network "$NETWORK" \
  -v "$VOLUME_OPTS" \
  -e "CELLD_ESBUILD=/workspace/.sinkd/bin/esbuild-linux" \
  -e "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" \
  -e "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" \
  -e "AWS_REGION=$AWS_REGION" \
  -e "S3_ENDPOINT=http://minio:9000" \
  -e "CELLD_BUCKET=$CELLD_BUCKET" \
  -w /workspace/apps/parties \
  "$IMAGE" \
  deploy . --bucket "$CELLD_BUCKET" --endpoint http://minio:9000 --region "$AWS_REGION"
deploy_status=$?
set -e

if [[ "$deploy_status" -ne 0 ]]; then
  echo
  echo "MinIO deploy failed (MinIO is not celld-qualified for production fleets)."
  echo "Dry-run bundle succeeded — see deploy/ for R2/S3/GCS/Azure."
  echo "Tear down: SINKD_MINIO=1 ./scripts/compose.sh down"
  exit 1
fi

echo "Deploy to MinIO succeeded."
echo "Start nodes: SINKD_MINIO=1 ./scripts/compose.sh up -d"
echo "Tear down:   SINKD_MINIO=1 ./scripts/compose.sh down"