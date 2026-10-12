# synkd

Self-hosted PartyKit-compatible realtime rooms. Develop on Node. Deploy the same parties to a Durable Objects fleet.

## Documentation

Published docs: [https://swiftugandan.github.io/synkd/](https://swiftugandan.github.io/synkd/)

Local site:

```sh
pnpm install
pnpm dev:site
```

Open [http://127.0.0.1:5180](http://127.0.0.1:5180).

| Audience | Start here |
| --- | --- |
| Developers | [Developer docs](./apps/site/developers/index.md) |
| Operators | [Operator docs](./apps/site/operators/index.md) |
| Architecture | [Architecture](./apps/site/architecture/index.md) |

## Quick start

```sh
pnpm install
pnpm build
pnpm doctor
pnpm up
```

Use `pnpm dev:all` to also start Studio, Console, and the docs site.

| App | URL |
| --- | --- |
| Site | http://127.0.0.1:5180 |
| Studio | http://127.0.0.1:5173 |
| Console | http://127.0.0.1:5174 (admin: `dev-admin`) |
| Runtime | http://127.0.0.1:8787 |

Guest token: `dev-token`. Config file: `apps/parties/synkd.json` (JSON, not YAML).

### New project

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts init ./my-rooms --name my-rooms
pnpm --filter @synkd/cli exec tsx src/bin.ts doctor --root ./my-rooms
pnpm --filter @synkd/cli exec tsx src/bin.ts up --root ./my-rooms
```

Public CLI verbs: `init`, `doctor`, `up`, `down`, `deploy`. Guide: [CLI](./apps/site/developers/cli.md).

## Ship a fleet

```sh
export CELLD_BUCKET=s3://your-bucket
export AWS_ACCESS_KEY_ID=…
export AWS_SECRET_ACCESS_KEY=…
export AWS_REGION=auto
export SYNKD_SITE=rooms.example.com

synkd deploy --root apps/parties --start-fleet
```

Local Durable Objects (optional): `synkd up --durable`, then Studio `?backend=durable`, then `synkd down`.

Details: [Deploy](./apps/site/operators/deploy.md).

## Packages

| Package | Role |
| --- | --- |
| `@synkd/server` | Party `Server` / `Connection` |
| `@synkd/runtime` | Node host, SQLite rooms, `/v1` |
| `@synkd/control` | Operator control API |
| `@synkd/auth` | Guest and admin gates |
| `@synkd/adapter-celld` | Durable Objects host adapter |
| `@synkd/cli` | `synkd init` / `up` / `down` / `deploy` / `doctor` |
| `@synkd/y` | Yjs / y-websocket party base |
| `@synkd/site` | Marketing and docs site |
| `@synkd/studio` | Guest demo |
| `@synkd/console` | Operator Console |

## Ops pointers

- Health: `GET /healthz`. Metrics: `GET /metrics`.
- Admin: `GET /v1/*` with a Bearer admin token.
- TLS fleets: [`deploy/README.md`](./deploy/README.md) and [Deploy](./apps/site/operators/deploy.md).
- Security: [`SECURITY.md`](./SECURITY.md) and [Security](./apps/site/operators/security.md).
