# sinkd ↔ PartyKit ↔ celld compatibility

Last updated: 2026-10-12 (celld 0.6.2 caps probed via Podman)

## Runtime matrix

| Capability | PartyServer / CF DO | sinkd Node (`@sinkd/runtime`) | sinkd on celld (`@sinkd/adapter-celld`) |
| --- | --- | --- | --- |
| `/parties/:party/:room` | Yes | Yes | Yes via `routeSinkdRequest` |
| `onConnect` / `onMessage` / `broadcast` | Yes | Yes | Yes |
| Connection tags (≤9 / 256) | Native `getTags` | Userland on Connection | **Native** on celld 0.6.2 (`getTags` probed true) |
| Hibernatable WebSockets | Yes | Idle empty rooms unload (`roomIdleMs`, close SQLite) | **Yes** — `acceptWebSocket` + `getWebSockets` probed true |
| Close 1012 on move/restart | Ownership move | Runtime `close()` / hot-reload drain | Ownership move |
| Per-room SQLite / KV | DO storage | `node:sqlite` files | DO storage via `DoStorageAdapter` |
| `onAlarm` | Yes | Polled by `AlarmScheduler` (SQLite/memory `setAlarm`) | Delegates to DO `alarm()` |
| Yjs / y-websocket | y-partykit | `@sinkd/y` `YjsServer` | Same party via `createDurableParty` |
| `request.cf` geo | Edge fields | Absent | Absent / empty on celld |
| Workers AI / Vectorize | Bindings | Non-goal | Non-goal |
| `partysocket` clients | Yes | Yes | Yes |

## Platform notes

- **Darwin x86_64:** no celld prebuild. Local DX = Node runtime. Fleet = Linux container via **Podman** (preferred) or Docker (`ghcr.io/denoland/celld`).
- **Darwin arm64 / Linux:** `curl -fsSL https://celld.dev/install.sh | sh` then `celld dev` / `celld deploy`.
- Ownership moves close sockets with code **1012** — clients must reconnect (partysocket does).
- Container CLI resolution: `scripts/container-runtime.sh` (override with `CONTAINER_CLI`).
- **Fleet smoke:** `pnpm fleet:smoke` brings up MinIO and runs `celld deploy` on the compose network. MinIO remains unqualified for production durability; use R2/S3/GCS/Azure for real fleets.
- **Observability:** Node `/healthz` (JSON) and `/metrics` (Prometheus text). Structured logs via `SINKD_LOG_LEVEL` / `SINKD_LOG_JSON=1`.

## Capability probe

```sh
pnpm celld:spike
# writes .sinkd/celld-caps.json and prints:
# GET /parties/main/<room>?token=…&sinkd_caps=1
```

| Field | Meaning |
| --- | --- |
| `capabilities.acceptWebSocket` | DO hibernation accept path present |
| `capabilities.getWebSockets` | Platform tag-filtered socket list |
| `capabilities.getTags` | Native per-socket tag read |
| `tagStrategy` | `native-do-getTags` vs `userland-connection-tags` |

**Live probe (2026-10-12, celld 0.6.2 / Podman):**
`acceptWebSocket=true`, `getWebSockets=true`, `getTags=true`, `tagStrategy=native-do-getTags`.

Node runtime still uses userland `Connection.tags`. Adapter uses hibernation `acceptWebSocket` when present. See `deploy/README.md` for TLS fleet ingress.

## Known deltas vs PartyKit cloud

1. No `*.partykit.dev` control plane / previews.
2. No `room.context.ai` / Vectorize magic.
3. Node storage values are JSON-serialized (not full structured clone).
4. One fleet = one trust domain (celld security model).