# CLI

The `synkd` CLI creates projects and runs the Node runtime.

## Commands

| Command | What it does |
| --- | --- |
| `synkd init [dir]` | Create a project with a Chat party and `synkd.json` |
| `synkd doctor` | Check Node, config, party entries, package links, celld host |
| `synkd dev` | Serve parties on HTTP and WebSocket (Node) |
| `synkd deploy` | Write `wrangler.jsonc` and print celld next steps |
| `synkd celld info` | Explain what celld is and how synkd uses it |
| `synkd celld prepare` | Refresh `wrangler.jsonc` for a project |
| `synkd celld dev` | Start a local celld node (Podman/Docker) |
| `synkd celld stop` | Stop the local celld container |
| `synkd celld deploy` | Push the worker to `CELLD_BUCKET` |

## Create a project

From this repository (after `pnpm build`):

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts init ./my-rooms --name my-rooms
```

That creates:

- `synkd.json` — parties and auth
- `src/chat.ts` — example party
- `src/worker.ts` — celld worker entry
- `package.json` — scripts and `@synkd/*` dependencies
- links under `node_modules/@synkd/` from the CLI install

Guest token: `dev-token`. Admin token: `dev-admin`.

## Check the project

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts doctor --root ./my-rooms
```

You should see `[ok]` for Node, config, party entry, and `@synkd/server resolvable`.

## Run the runtime

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts dev --root ./my-rooms
```

Useful flags:

| Flag | Effect |
| --- | --- |
| `--port 8787` | Listen port |
| `--no-watch` | Do not reload party files |
| `--root <dir>` | Project directory that holds `synkd.json` |

When the server is up:

```sh
curl -s http://127.0.0.1:8787/healthz
curl -s "http://127.0.0.1:8787/parties/main/demo?token=dev-token"
```

## How package linking works

Packages are not all on the public npm registry yet. The CLI still needs `@synkd/server` (and related packages) to load on disk.

So `init` and `dev`:

1. write `file:` dependency paths when the CLI can see the monorepo packages, or `0.1.0` as a placeholder for a later registry install
2. symlink those packages into the project’s `node_modules/@synkd/`

You do not need a separate `pnpm install` in the new project for local CLI use from this repo.

When packages are published, you can install them from npm like any other dependency. A real install in `node_modules` is left alone; the CLI does not overwrite it.

## Run on celld

celld hosts the same parties as Durable Objects. You need Podman/Docker or a native [celld](https://celld.dev) binary.

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts celld info
pnpm --filter @synkd/cli exec tsx src/bin.ts celld prepare --root ./my-rooms
# From the synkd monorepo (container scripts):
pnpm celld:dev
```

`synkd deploy` only refreshes `wrangler.jsonc` and prints next steps. Full guide: [Run on celld](/operators/celld).

## What to do next

- [Write a party](./write-a-party)
- [Connect clients](./connect-clients)
- [Get started](./get-started) for Studio and the full example stack
- Operators: [Run on celld](/operators/celld)
