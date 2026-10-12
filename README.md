# synkd

Self-hosted PartyKit-compatible realtime rooms on Node and celld.

## Documentation site

Published docs: [https://swiftugandan.github.io/synkd/](https://swiftugandan.github.io/synkd/)

Local:

```sh
pnpm install
pnpm dev:site
```

Open [http://127.0.0.1:5180](http://127.0.0.1:5180).

| Audience | Start here |
| --- | --- |
| Developers | [Developer docs](./apps/site/developers/index.md) → site `/developers/` |
| Operators | [Operator docs](./apps/site/operators/index.md) → site `/operators/` |
| Architecture | [Architecture](./apps/site/architecture/index.md) → site `/architecture/` (SVG diagrams) |

Canonical browsing path is the VitePress site. Markdown under `apps/site/` is the source.

## Quick start

```sh
pnpm install
pnpm build
pnpm doctor
pnpm dev:all
```

| App | URL |
| --- | --- |
| Site | http://127.0.0.1:5180 |
| Studio | http://127.0.0.1:5173 |
| Console | http://127.0.0.1:5174 (admin: `dev-admin`) |
| Runtime | http://127.0.0.1:8787 |

Guest token: `dev-token`. Config: `apps/parties/synkd.json`.

## Packages

| Package | Role |
| --- | --- |
| `@synkd/server` | Party `Server` / `Connection` |
| `@synkd/runtime` | Node host, SQLite rooms, `/v1` |
| `@synkd/control` | Operator control API |
| `@synkd/auth` | Guest and admin gates |
| `@synkd/adapter-celld` | celld Durable Object host |
| `@synkd/cli` | `synkd init` / `dev` / `deploy` / `doctor` |
| `@synkd/y` | Yjs / y-websocket party base |
| `@synkd/site` | Marketing + docs site |
| `@synkd/studio` | Guest demo |
| `@synkd/console` | Operator Console |

Full package list: site → [Packages](./apps/site/developers/packages.md).

## Ops pointers

- Health: `GET /healthz`, Prometheus: `GET /metrics`
- Admin: `GET /v1/*` (Bearer admin token)
- TLS fleets: [`deploy/README.md`](./deploy/README.md) and site → [Deploy](./apps/site/operators/deploy.md)
- Security model: [`SECURITY.md`](./SECURITY.md) and site → [Security](./apps/site/operators/security.md)
