# synkd

Self-hosted **PartyKit-compatible** realtime rooms — production-shaped Node runtime, optional celld fleets, guest **Studio**, and operator **Console**.

Formerly prototyped as `sinkd`; the Party URL shape `/parties/:party/:room` and `partysocket` clients are unchanged.

```
Browser (Studio / apps) → /parties/:party/:room → room actor → durable storage
Operator (Console)      → /v1/* (admin)         → runtime inspector
```

## Quick start

```sh
pnpm install
pnpm build
pnpm doctor
pnpm dev          # hot-reloads party sources; --no-watch to disable
```

In other terminals:

```sh
pnpm dev:studio    # http://127.0.0.1:5173
pnpm dev:console   # http://127.0.0.1:5174  (admin token: dev-admin)
```

Or all at once: `pnpm dev:all`.

Default guest token: `dev-token`. Admin token: `dev-admin` (see `apps/parties/synkd.json`). Legacy `sinkd.json` is still resolved if `synkd.json` is absent.

## Packages

| Package | Role |
| --- | --- |
| `@synkd/contracts` | URL shape, tag limits, errors |
| `@synkd/server` | PartyServer-compatible `Server` / `Connection` |
| `@synkd/runtime` | Node HTTP + WebSocket host, SQLite rooms, `/v1` mount |
| `@synkd/control` | Operator control API router + `RuntimeInspector` |
| `@synkd/auth` | Guest lobby + admin gates |
| `@synkd/adapter-celld` | Durable Object host for celld |
| `@synkd/config` | `synkd.json` → wrangler bindings |
| `@synkd/cli` | `synkd init` / `dev` / `deploy` / `doctor` |
| `@synkd/client` | thin `partysocket` helpers |
| `@synkd/y` | `YjsServer` (y-websocket sync + awareness) |
| `@synkd/ui` | Shared brand tokens |
| `@synkd/studio` | Guest chat / Yjs pad |
| `@synkd/console` | Operator console |
| `@synkd/parties` | example Chat, Presence, Docs parties |

## Ops

- `GET /healthz` — JSON health
- `GET /metrics` — Prometheus text
- `GET /v1/health|rooms|capabilities|metrics` — admin Bearer required
- `POST /v1/rooms/:party/:room/hibernate` — force unload

TLS fleet ingress: [`deploy/README.md`](./deploy/README.md). Security model: [`SECURITY.md`](./SECURITY.md). Multi-tenant pathway: [`docs/multi-tenant-path.md`](./docs/multi-tenant-path.md).

## celld fleets

Darwin x86_64 has no celld prebuild. Local DX uses `@synkd/runtime`. Fleets use **Podman** (preferred) or Docker:

```sh
pnpm celld:spike
./scripts/compose.sh up -d
```

Compatibility: `docs/compat.md`. Yjs: `docs/yjs.md`.
