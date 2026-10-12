# sinkd

Self-hosted **PartyKit-compatible** realtime rooms.

Party classes use the PartyServer programming model (`onConnect`, `onMessage`, `broadcast`, tags, dual HTTP + WebSocket). Locally, `@sinkd/runtime` runs sticky room actors on Node with SQLite. On Linux/ARM64 fleets, the same mental model deploys onto [celld](https://celld.dev/docs/) (self-hosted Durable Objects).

```
Browser (partysocket) → /parties/:party/:room → room actor → durable storage
```

## Quick start

```sh
pnpm install
pnpm build
pnpm --filter @sinkd/cli exec sinkd dev --root apps/parties
```

In another terminal:

```sh
pnpm dev:studio
```

Open the Studio URL Vite prints (http://127.0.0.1:5173 by default) — enter a room, open a second tab, send messages.

Default lobby token: `dev-token` (see `apps/parties/sinkd.json`).

## Packages

| Package | Role |
| --- | --- |
| `@sinkd/contracts` | URL shape, tag limits, errors |
| `@sinkd/server` | PartyServer-compatible `Server` / `Connection` |
| `@sinkd/runtime` | Node HTTP + WebSocket host, SQLite rooms |
| `@sinkd/config` | `sinkd.json` → wrangler bindings |
| `@sinkd/cli` | `sinkd init` / `dev` / `deploy` |
| `@sinkd/client` | thin `partysocket` helpers |
| `@sinkd/studio` | brand + live room UI |
| `@sinkd/parties` | example Chat party |

## CLI

```sh
pnpm --filter @sinkd/cli exec sinkd init my-app
pnpm --filter @sinkd/cli exec sinkd dev --root my-app
pnpm --filter @sinkd/cli exec sinkd deploy --config my-app/sinkd.json
```

## celld fleets

This machine (Darwin x86_64) has no celld prebuild. Use Docker on Linux hosts:

```sh
# from a Worker project with wrangler.jsonc
docker run --rm -v "$PWD":/app -w /app ghcr.io/denoland/celld deploy .
```

See `deploy/docker-compose.yml` for a two-node + Caddy template.

## Docs

- `VISION.md` · `SPEC.md` · `SAD.md` · `CONTRACTS.md` · `PLAN.md`
- Research report: `../reports/Sinkd Celld PartyKit design.md`

## Tests

```sh
pnpm test
```
