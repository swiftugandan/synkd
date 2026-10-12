# Run on celld

**celld** is an open-source daemon that runs Cloudflare Workers and Durable Objects on machines you control ([celld.dev](https://celld.dev)). synkd parties are the same TypeScript classes on Node or on celld — only the host changes.

Use **Node** (`synkd dev` / `pnpm dev`) for everyday local work. Use **celld** when you need Durable Object storage, hibernation APIs, or a multi-node fleet.

## What you need

| Piece | Why |
| --- | --- |
| Podman (preferred) or Docker | Runs the official `ghcr.io/denoland/celld` image when you have no native binary |
| Or a native `celld` binary | Linux / ARM64: `curl -fsSL https://celld.dev/install.sh \| sh` |
| `apps/parties` (or your `synkd init` project) | Party code + `src/worker.ts` + `wrangler.jsonc` |

`synkd doctor` reports whether a container runtime or `celld` binary is available. `synkd celld info` prints this overview.

## Local Durable Object host

From this repository:

```sh
pnpm celld:dev
```

That script:

1. Writes `wrangler.jsonc` from `synkd.json`
2. Builds the celld adapter packages
3. Starts a named container (`synkd-celld-dev`) listening on **:9876**
4. Probes HTTP + WebSocket, then **leaves celld running**

```sh
# Studio against celld
open 'http://127.0.0.1:5173/?backend=celld'

# Stop when finished
pnpm celld:stop
```

Equivalent CLI:

```sh
synkd celld prepare --root apps/parties
synkd celld dev --root apps/parties
synkd celld stop
```

### Native binary (no container)

```sh
cd apps/parties   # or your project
synkd deploy      # refresh wrangler.jsonc
celld dev         # http://127.0.0.1:9876
```

## Capability probe

```sh
curl -s "http://127.0.0.1:9876/parties/main/healthz?token=dev-token&synkd_caps=1"
```

| Field | Meaning |
| --- | --- |
| `capabilities.acceptWebSocket` | Hibernation accept path present |
| `capabilities.getWebSockets` | Platform socket list |
| `capabilities.getTags` | Native per-socket tags |
| `tagStrategy` | Native DO tags versus userland tags |

On celld 0.6.2 these hibernation and tag APIs probe as available.

## Production fleet

1. Point `CELLD_BUCKET` at a **qualified** object store (R2 / S3 / GCS / Azure — not MinIO for production).
2. Deploy the worker artifact: `pnpm celld:deploy`
3. Start nodes + Caddy: `pnpm fleet:up` (or `./scripts/compose.sh up -d`)

Full TLS checklist: [Deploy with TLS](./deploy).

## Commands cheat sheet

| Command | Role |
| --- | --- |
| `pnpm celld:dev` | Local celld on :9876 (keeps running) |
| `pnpm celld:stop` | Stop local container |
| `pnpm celld:deploy` | `celld deploy` into `CELLD_BUCKET` |
| `pnpm celld:smoke` | Start → probe → stop (CI) |
| `pnpm fleet:up` | Compose celld nodes + Caddy |
| `synkd celld info` | Explain celld in the terminal |

## Container CLI

Scripts resolve Podman or Docker through `scripts/container-runtime.sh`. Override with `CONTAINER_CLI` if needed. Image override: `CELLD_IMAGE=ghcr.io/denoland/celld:0.6.2`.

## What to do next

- [Deploy with TLS](./deploy)
- [Security](./security)
- [Developer compatibility](/developers/compatibility)
