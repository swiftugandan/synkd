# sinkd ↔ PartyKit ↔ celld compatibility

Last updated: 2026-10-12

## Runtime matrix

| Capability | PartyServer / CF DO | sinkd Node (`@sinkd/runtime`) | sinkd on celld (`@sinkd/adapter-celld`) |
| --- | --- | --- | --- |
| `/parties/:party/:room` | Yes | Yes | Yes via `routeSinkdRequest` |
| `onConnect` / `onMessage` / `broadcast` | Yes | Yes | Yes |
| Connection tags (≤9 / 256) | Native `getTags` | Userland on Connection | Userland (probe native `getTags` on target celld) |
| Hibernatable WebSockets | Yes | Process-local idle rooms | Yes when DO hibernation APIs present |
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

## Tag probe

Run on a celld-capable host:

```sh
./scripts/celld-spike.sh
```

Until probed green, sinkd stores tags on the `Connection` object and filters in `getConnections(tag)`.

## Known deltas vs PartyKit cloud

1. No `*.partykit.dev` control plane / previews.
2. No `room.context.ai` / Vectorize magic.
3. Node storage values are JSON-serialized (not full structured clone).
4. One fleet = one trust domain (celld security model).