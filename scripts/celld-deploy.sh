#!/usr/bin/env bash
# Bundle the party worker and push it to a celld object-store bucket.
# Requires CELLD_BUCKET (s3://… / gs://… / etc.) and store credentials.
#
# Usage:
#   export CELLD_BUCKET=s3://your-bucket
#   export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… AWS_REGION=auto
#   pnpm celld:deploy
#
# Then start the fleet: ./scripts/compose.sh up -d
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=lib/celld-common.sh
source "$ROOT/scripts/lib/celld-common.sh"

if [[ -z "${CELLD_BUCKET:-}" ]]; then
  cat >&2 <<'EOF'
CELLD_BUCKET is required.

Example:
  export CELLD_BUCKET=s3://your-bucket
  export AWS_ACCESS_KEY_ID=…
  export AWS_SECRET_ACCESS_KEY=…
  export AWS_REGION=auto
  pnpm celld:deploy

See: apps/site/operators/celld.md and deploy/README.md
EOF
  exit 1
fi

PROJECT="$(celld_project_dir "${1:-}")"
RUNTIME="$(resolve_container_cli)"
VOLUME_OPTS="$(celld_volume_opts)"
WORKDIR="/workspace/${PROJECT#"$ROOT"/}"

echo "==> container runtime: $RUNTIME"
echo "==> project: $PROJECT"
echo "==> bucket: $CELLD_BUCKET"
"$RUNTIME" run --rm "$CELLD_IMAGE" --version

celld_prepare_project "$PROJECT"
celld_ensure_linux_esbuild "$RUNTIME"

echo "==> celld deploy to $CELLD_BUCKET"
"$RUNTIME" run --rm \
  -v "$VOLUME_OPTS" \
  -e "CELLD_BUCKET=$CELLD_BUCKET" \
  -e "AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}" \
  -e "AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}" \
  -e "AWS_REGION=${AWS_REGION:-auto}" \
  -e "S3_ENDPOINT=${S3_ENDPOINT:-}" \
  -e "CELLD_ESBUILD=/workspace/.synkd/bin/esbuild-linux" \
  -w "$WORKDIR" \
  "$CELLD_IMAGE" \
  deploy . --bucket "$CELLD_BUCKET"

cat <<EOF

Deployed worker artifact to $CELLD_BUCKET.

Start a multi-node fleet with TLS ingress:

  export SYNKD_SITE=rooms.example.com
  synkd deploy --start-fleet
  # or: ./scripts/compose.sh up -d

Docs: apps/site/operators/deploy.md
EOF
