# Fleet deploy

PartyKit-shaped rooms on a **celld** fleet with cookie-sticky TLS ingress.

Plain-English operator guide: run `pnpm dev:site` and open
[Operators → Deploy with TLS](../apps/site/operators/deploy.md)
(`http://127.0.0.1:5180/operators/deploy`).

## Topology

```
Browser (wss) → Caddy :443 → celld-a / celld-b :8080 → Durable Object room
                              ↕ internal :8081
                         object store (R2/S3/GCS/Azure)
```

## Production (qualified object store)

```sh
export CELLD_BUCKET=s3://your-bucket
export AWS_ACCESS_KEY_ID=…
export AWS_SECRET_ACCESS_KEY=…
export AWS_REGION=auto
export SYNKD_SITE=rooms.example.com   # public DNS → this host

# Build + push worker artifact
pnpm --filter @synkd/cli exec tsx src/bin.ts deploy --config apps/parties/synkd.json
CELLD_BUCKET="$CELLD_BUCKET" pnpm celld:deploy

# Fleet + Caddy (Let's Encrypt via SYNKD_SITE)
SYNKD_SITE=rooms.example.com pnpm fleet:up
```

New to celld? See [Run on celld](../apps/site/operators/celld.md).

Point DNS A/AAAA for `SYNKD_SITE` at the Caddy host. Caddy terminates TLS and load-balances to both celld nodes with a sticky cookie (`synkd_lb`).

## Local lab (MinIO + internal TLS)

MinIO is **not** celld-qualified for production durability — labs only.

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

# after MinIO is healthy:
CELLD_BUCKET=s3://synkd-cells \
  AWS_ACCESS_KEY_ID=synkd AWS_SECRET_ACCESS_KEY=synkdsecret \
  AWS_REGION=us-east-1 S3_ENDPOINT=http://minio:9000 \
  pnpm fleet:smoke
```

Open `https://localhost/` (Caddy `tls internal`). For a single-node local host without compose, use `pnpm celld:dev` (:9876) and Studio `?backend=celld`.

## Caps probe

After a celld listener is up:

```sh
curl -s "http://127.0.0.1:9876/parties/main/healthz?token=dev-token&synkd_caps=1"
```

Reports whether hibernation `acceptWebSocket` / `getWebSockets` exist on the DO state (native tag routing vs synkd userland tags).

## Files

| File | Role |
| --- | --- |
| `docker-compose.yml` | celld-a/b + Caddy |
| `Caddyfile` | Public HTTPS (`SYNKD_SITE`) |
| `Caddyfile.local` | Lab HTTPS (`tls internal`) |
| `compose.tls-local.yml` | Mount local Caddyfile + data vols |
| `compose.minio.yml` | Experimental object store |
