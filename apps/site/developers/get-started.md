# Get started

This guide gets synkd running on your machine. You can use the example apps in this repo, or create a new project with the CLI.

## Before you start

You need:

- Node.js 22 or later
- pnpm 10

Check your versions:

```sh
node -v
pnpm -v
```

## Option A — example stack in this repo

From the repository root:

```sh
pnpm install
pnpm build
pnpm doctor
pnpm dev:all
```

| App | URL | Who uses it |
| --- | --- | --- |
| Runtime | http://127.0.0.1:8787 | Parties and WebSockets |
| Studio | http://127.0.0.1:5173 | Guests (chat and pad) |
| Console | http://127.0.0.1:5174 | Operators |
| Docs site | http://127.0.0.1:5180 | Guides |

Or start processes separately:

```sh
pnpm up
pnpm dev:studio
pnpm dev:console
pnpm dev:site
```

### Open a room

1. Open Studio.
2. Choose Chat or Pad.
3. Keep Runtime set to **Node** (or **Durable** after `synkd up --durable`).
4. Enter a room id and select **Enter room**.

The guest token is `dev-token`. The admin token for Console is `dev-admin`. Both are in `apps/parties/synkd.json`.

### Check health

```sh
curl -s http://127.0.0.1:8787/healthz
```

You should see `"ok": true` and `"service": "synkd"`.

## Option B — new project with the CLI

```sh
pnpm install
pnpm build
pnpm --filter @synkd/cli exec tsx src/bin.ts init ./my-rooms --name my-rooms
pnpm --filter @synkd/cli exec tsx src/bin.ts doctor --root ./my-rooms
pnpm --filter @synkd/cli exec tsx src/bin.ts up --root ./my-rooms
```

The CLI links `@synkd/*` packages from this monorepo so `up` works before those packages are on npm. Full command reference: [CLI](./cli).

## What to do next

- [CLI](./cli) — `init`, `doctor`, `up`, `down`, `deploy`
- [Write a party](./write-a-party)
- [Connect clients](./connect-clients)
- [Operator get started](/operators/get-started) for Console and `/v1`
- [Deploy](/operators/deploy) for Durable Objects and fleets
