# Use the Console

The Console is the operator UI for one synkd fleet.

## Open it

```sh
pnpm dev:console
```

URL: [http://127.0.0.1:5174](http://127.0.0.1:5174)

Sign in with `auth.adminToken`. The token is kept in `sessionStorage` until you sign out.

## What you can do

| Section | Purpose |
| --- | --- |
| Fleet | Version, uptime, tenant, runtime capabilities |
| Rooms | Warm rooms, socket counts, open in Studio, hibernate |
| Observability | Counters from `/v1/health` and a metrics preview |
| Access | Reminder of guest versus admin tokens |

## Hibernate a room

On a warm room row, select **Hibernate**. That calls:

```http
POST /v1/rooms/:party/:room/hibernate
Authorization: Bearer <adminToken>
```

Empty idle rooms may also unload on their own when hibernation is enabled.

## Protect the Console

Do not expose Console or `/v1` to the public internet without controls. Prefer:

- private network or VPN
- IP allowlist at the edge
- a separate admin hostname

`/v1` can list rooms and force unload. Treat it like other admin APIs.

## What to do next

- [Monitor health](./monitor)
- [Security](./security)
