# Fleet deploy

PartyKit-shaped rooms on a Durable Objects fleet with cookie-sticky TLS ingress.

Plain-English operator guide: [Deploy](../apps/site/operators/deploy.md)
(`http://127.0.0.1:5180/operators/deploy`).

## Topology

```
Browser (wss) → Caddy :443 → durable nodes :8080 → Durable Object room
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

synkd deploy --root apps/parties --start-fleet
```

Point DNS A/AAAA for `SYNKD_SITE` at the Caddy host. Caddy terminates TLS and load-balances to both nodes with a sticky cookie (`synkd_lb`).

## Local Durable Objects (no compose)

```sh
synkd up --durable
# Studio: http://127.0.0.1:5173/?backend=durable
synkd down
```

## Local lab (MinIO + internal TLS)

MinIO is **not** qualified for production durability — labs only.

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

pnpm fleet:smoke
```

Open `https://localhost/` (Caddy `tls internal`).

## Caps probe

```sh
curl -s "http://127.0.0.1:9876/parties/main/healthz?token=dev-token&synkd_caps=1"
```

## Files

| File | Role |
| --- | --- |
| `docker-compose.yml` | Durable Object nodes + Caddy |
| `Caddyfile` | Public HTTPS (`SYNKD_SITE`) |
| `Caddyfile.local` | Lab HTTPS (`tls internal`) |
| `compose.tls-local.yml` | Mount local Caddyfile + data vols |
| `compose.minio.yml` | Experimental object store |
