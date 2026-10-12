# Deploy with TLS

Production fleets use celld behind Caddy. Caddy terminates HTTPS and sticky-balances to celld nodes.

## Topology

```
Browser (wss)
  → Caddy :443
  → celld-a / celld-b :8080
  → Durable Object room
       ↕ object store (R2 / S3 / GCS / Azure)
```

## Production checklist

1. Use a qualified object store. Do not use MinIO for production durability.
2. Set DNS A/AAAA for your public hostname to the Caddy host.
3. Export store credentials and `SYNKD_SITE`.
4. Build and deploy the worker artifact.
5. Start compose with Caddy.

```sh
export CELLD_BUCKET=s3://your-bucket
export AWS_ACCESS_KEY_ID=…
export AWS_SECRET_ACCESS_KEY=…
export AWS_REGION=auto
export SYNKD_SITE=rooms.example.com

pnpm --filter @synkd/cli exec tsx src/bin.ts deploy \
  --config apps/parties/synkd.json

CELLD_BUCKET="$CELLD_BUCKET" pnpm celld:spike

SYNKD_SITE=rooms.example.com ./scripts/compose.sh up -d
```

Caddy uses a sticky cookie named `synkd_lb`.

## Local lab with MinIO

MinIO is for labs only.

```sh
export CELLD_BUCKET=s3://synkd-cells
export AWS_ACCESS_KEY_ID=synkd
export AWS_SECRET_ACCESS_KEY=synkdsecret
export AWS_REGION=us-east-1
export S3_ENDPOINT=http://minio:9000

./scripts/compose.sh \
  -f docker-compose.yml \
  -f compose.minio.yml \
  -f compose.tls-local.yml \
  up -d
```

Open `https://localhost/` (Caddy `tls internal`).

Smoke:

```sh
pnpm fleet:smoke
```

## Compose files

| File | Role |
| --- | --- |
| `deploy/docker-compose.yml` | celld nodes and Caddy |
| `deploy/Caddyfile` | Public HTTPS via `SYNKD_SITE` |
| `deploy/Caddyfile.local` | Lab HTTPS with internal TLS |
| `deploy/compose.minio.yml` | Lab object store |
| `deploy/compose.tls-local.yml` | Local Caddy mounts |

More detail lives in the repo at `deploy/README.md`.

## What to do next

- [celld fleets](./celld-fleets)
- [Security](./security)
