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
pnpm doctor
pnpm dev
```

In another terminal:

```sh
pnpm dev:studio
```

Open the Studio URL Vite prints (`http://127.0.0.1:5173` by default) — enter a room, open a second tab, send messages.

Default lobby token: `dev-token` (see `apps/parties/sinkd.json`). JWT lobby auth is supported via `auth.jwtSecret`.

## Packages

| Package | Role |
| --- | --- |
| `@sinkd/contracts` | URL shape, tag limits, errors |
| `@sinkd/server` | PartyServer-compatible `Server` / `Connection` |
| `@sinkd/runtime` | Node HTTP + WebSocket host, SQLite rooms |
| `@sinkd/auth` | Shared-token + JWT lobby gates, origin allowlists |
| `@sinkd/adapter-celld` | Durable Object host + `routeSinkdRequest` for celld |
| `@sinkd/config` | `sinkd.json` → wrangler bindings |
| `@sinkd/cli` | `sinkd init` / `dev` / `deploy` / `doctor` |
| `@sinkd/client` | thin `partysocket` helpers |
| `@sinkd/studio` | brand + live room UI |
| `@sinkd/parties` | example Chat party |

## CLI

```sh
pnpm doctor
pnpm --filter @sinkd/cli exec tsx src/bin.ts init ./my-app
pnpm --filter @sinkd/cli exec tsx src/bin.ts dev --root ./my-app
pnpm --filter @sinkd/cli exec tsx src/bin.ts deploy --config ./my-app/sinkd.json
```

## celld fleets

Darwin x86_64 has no celld prebuild. Local DX uses `@sinkd/runtime`. Fleets use **Podman** (preferred) or Docker:

```sh
pnpm celld:spike              # resolves podman → docker
./scripts/compose.sh up -d    # set CELLD_BUCKET first
```

Override the runtime with `CONTAINER_CLI=podman` or `CONTAINER_CLI=docker`.

Local MinIO overlay (experimental — not celld-qualified for production):

```sh
pnpm fleet:minio
```

Studio can target Node (`?backend=node`) or celld (`?backend=celld` on `:9876`).

Compatibility matrix: `docs/compat.md`.

## Docs

- `VISION.md` · `SPEC.md` · `SAD.md` · `CONTRACTS.md` · `PLAN.md`
- Research report: `../reports/Sinkd Celld PartyKit design.md`

## Tests

```sh
pnpm test
```
