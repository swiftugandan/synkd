# Get started

This guide gets the Node runtime and operator Console running on your machine.

## Before you start

You need Node.js 22 and pnpm 10.

```sh
pnpm install
pnpm build
pnpm doctor
```

## Start the runtime and Console

```sh
pnpm dev
pnpm dev:console
```

Or use `pnpm dev:all` to also start Studio.

## Sign in to the Console

1. Open [http://127.0.0.1:5174](http://127.0.0.1:5174).
2. Enter the admin token from `apps/parties/synkd.json`.
3. The default lab token is `dev-admin`.

You should see **fleet up**, version, uptime, and room list.

## Confirm health without the UI

```sh
curl -s http://127.0.0.1:8787/healthz
curl -s http://127.0.0.1:8787/metrics | head
```

Admin control routes need a Bearer token:

```sh
curl -s -H "Authorization: Bearer dev-admin" \
  http://127.0.0.1:8787/v1/health
```

## Lab secrets

| Setting | Default in repo | Audience |
| --- | --- | --- |
| `auth.token` | `dev-token` | Guests / Studio |
| `auth.adminToken` | `dev-admin` | Console / `/v1` |

Change these before any shared or public deploy. See [Security](./security).

## What to do next

- [Configure a fleet](./configure)
- [Use the Console](./console)
- [Monitor health](./monitor)
