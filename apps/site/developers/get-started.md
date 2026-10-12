# Get started

This guide gets a local synkd stack running so you can open a room in Studio.

## Before you start

You need:

- Node.js 22 or later
- pnpm 10

Check your versions:

```sh
node -v
pnpm -v
```

## Install and build

From the repository root:

```sh
pnpm install
pnpm build
pnpm doctor
```

`doctor` checks that `synkd.json` and party entries look valid.

## Run the stack

Start the runtime, Studio, and Console together:

```sh
pnpm dev:all
```

Or start them in separate terminals:

```sh
pnpm dev
pnpm dev:studio
pnpm dev:console
```

| App | URL | Who uses it |
| --- | --- | --- |
| Runtime | http://127.0.0.1:8787 | Parties and WebSockets |
| Studio | http://127.0.0.1:5173 | Guests (chat and pad) |
| Console | http://127.0.0.1:5174 | Operators |

## Open a room

1. Open Studio.
2. Choose Chat or Pad.
3. Keep Runtime set to Node.
4. Enter a room id and select **Enter room**.

The guest lobby token defaults to `dev-token` (see `apps/parties/synkd.json`).

## Check the runtime is healthy

```sh
curl -s http://127.0.0.1:8787/healthz
```

You should see JSON with `"ok": true` and `"service": "synkd"`.

## What to do next

- [Write a party](./write-a-party) if you are adding server logic
- [Connect clients](./connect-clients) if you are wiring a browser app
- [Operator get started](/operators/get-started) if you need Console access
