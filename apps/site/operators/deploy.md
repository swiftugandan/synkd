# Deploy

Develop on Node with `synkd up`. Ship the same party classes to a Durable Objects fleet with TLS at the edge. `synkd deploy` is the production command.

## Commands

| Command | What it does |
| --- | --- |
| `synkd up` | Starts the local Node runtime |
| `synkd up --durable` | Starts a local Durable Objects host on port 9876 |
| `synkd down` | Stops the local Durable Objects host |
| `synkd deploy` | Writes worker config; with `CELLD_BUCKET` set, pushes the artifact |
| `synkd deploy --start-fleet` | Pushes the artifact, then starts the compose fleet |

## Local Durable Objects

Use this when you need Durable Object storage or hibernation APIs on your laptop. You need Podman or Docker.

```sh
synkd up --durable --root apps/parties
```

Open Studio with `?backend=durable`:

[http://127.0.0.1:5173/?backend=durable](http://127.0.0.1:5173/?backend=durable)

Stop the host:

```sh
synkd down
```

Check platform capabilities:

```sh
curl -s "http://127.0.0.1:9876/parties/main/healthz?token=dev-token&synkd_caps=1"
```

## Production topology

```
Browser (wss)
  → Caddy :443
  → durable nodes :8080
  → Durable Object room
       ↕ object store (R2 / S3 / GCS / Azure)
```

## Production checklist

1. Use a qualified object store. Do not use MinIO for production durability.
2. Point DNS for your public hostname at the Caddy host.
3. Export store credentials and `SYNKD_SITE`.
4. Deploy the worker and start the fleet.

```sh
export CELLD_BUCKET=s3://your-bucket
export AWS_ACCESS_KEY_ID=…
export AWS_SECRET_ACCESS_KEY=…
export AWS_REGION=auto
export SYNKD_SITE=rooms.example.com

synkd deploy --root apps/parties --start-fleet
```

Caddy sets a sticky cookie named `synkd_lb`.

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

Open `https://localhost/` (Caddy uses `tls internal`). Run `pnpm fleet:smoke` to check the wiring.

## Compose files

| File | Role |
| --- | --- |
| `deploy/docker-compose.yml` | Durable Object nodes and Caddy |
| `deploy/Caddyfile` | Public HTTPS via `SYNKD_SITE` |
| `deploy/Caddyfile.local` | Lab HTTPS with internal TLS |
| `deploy/compose.minio.yml` | Lab object store |
| `deploy/compose.tls-local.yml` | Local Caddy mounts |

More detail lives in `deploy/README.md`.

## What to do next

- [Get started](./get-started)
- [Security](./security)
- [Developer compatibility](/developers/compatibility)
