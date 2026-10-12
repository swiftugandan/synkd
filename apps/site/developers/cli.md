# CLI

The `synkd` CLI is the public surface. Learn five commands.

## Commands

| Command | What it does |
| --- | --- |
| `synkd init [dir]` | Creates a project with a Chat party and `synkd.json` |
| `synkd doctor` | Checks Node, config, party entries, and package links |
| `synkd up` | Starts the local Node host |
| `synkd up --durable` | Starts a local Durable Objects host (needs Podman or Docker) |
| `synkd down` | Stops the Durable Objects host from `up --durable` |
| `synkd deploy` | Prepares worker config; with `CELLD_BUCKET`, pushes to the object store |
| `synkd deploy --start-fleet` | Pushes, then starts the compose fleet |

`synkd dev` is an alias of `synkd up` for one release.

## Configuration file

Every project has a **`synkd.json`** file in the project root. It is JSON (not YAML). It lists:

- project `name`
- `host` and `port` for the Node runtime
- `parties` (entry module, export, Durable Object class name)
- `auth` tokens
- optional `cors`, `storageDir`, and `tenantId`

`synkd deploy` also writes a derived `wrangler.jsonc` for the Durable Objects host. Edit `synkd.json`. Do not treat `wrangler.jsonc` as the source of truth.

## Create a project

From this repository (after `pnpm build`):

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts init ./my-rooms --name my-rooms
```

That creates:

- `synkd.json` — parties and auth
- `src/chat.ts` — example party
- `src/worker.ts` — Durable Objects worker entry
- `package.json` — scripts and `@synkd/*` dependencies
- links under `node_modules/@synkd/` from the CLI install

Guest token: `dev-token`. Admin token: `dev-admin`.

## Check and run

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts doctor --root ./my-rooms
pnpm --filter @synkd/cli exec tsx src/bin.ts up --root ./my-rooms
```

Useful flags on `up`:

| Flag | Effect |
| --- | --- |
| `--port 8787` | Listen port (Node) |
| `--no-watch` | Do not reload party files |
| `--root <dir>` | Project directory that holds `synkd.json` |
| `--durable` | Durable Objects host on port 9876 instead of Node |

When the Node server is up:

```sh
curl -s http://127.0.0.1:8787/healthz
curl -s "http://127.0.0.1:8787/parties/main/demo?token=dev-token"
```

## How package linking works

Packages are not all on the public npm registry yet. The CLI still needs `@synkd/server` (and related packages) on disk.

So `init` and `up`:

1. write `file:` dependency paths when the CLI can see the monorepo packages, or `0.1.0` as a placeholder for a later registry install
2. symlink those packages into the project’s `node_modules/@synkd/`

You do not need a separate `pnpm install` in the new project for local CLI use from this repo.

## Deploy

```sh
export CELLD_BUCKET=s3://your-bucket
pnpm --filter @synkd/cli exec tsx src/bin.ts deploy --root ./my-rooms --start-fleet
```

Without `CELLD_BUCKET`, `deploy` only writes worker config and prints next steps. Full guide: [Deploy](/operators/deploy).

## What to do next

- [Write a party](./write-a-party)
- [Connect clients](./connect-clients)
- [Get started](./get-started) for Studio and the full example stack
- Operators: [Deploy](/operators/deploy)
