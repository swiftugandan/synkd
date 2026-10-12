# Software Architecture Document

## 30,000-ft view

### Context

```
Browser (partysocket / Studio) ──TLS──▶ Ingress (optional Caddy)
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
            sinkd Node runtime                         celld fleet (Linux)
            (@sinkd/runtime)                           Durable Object cells
                    │                                         │
                    └────────── same party class code ────────┘
                               (@sinkd/server Server API)
```

External actors: application users (browsers), operators (CLI/deploy), optional object storage (celld fleets).

### Trust boundaries

1. **Public edge** — TLS + Origin + lobby auth (`onBeforeConnect`).
2. **Room actor** — trusted application code; all connections in a room share the actor.
3. **Fleet / process** — single trust domain; bucket credentials and peer overlay are root-equivalent on celld.

### Out-of-band concerns

- Node path: SQLite files under `.sinkd/rooms/` (configurable).
- celld path: per-cell SQLite + S3/GCS/Azure bucket leases.
- Studio is a static SPA talking to the runtime over WS/HTTP.

## 10,000-ft view

### Components

| Component | Owns | Speaks to |
| --- | --- | --- |
| `@sinkd/contracts` | Protocol types, limits, errors | everyone |
| `@sinkd/server` | `Server` base, `Connection`, room storage interface | runtime, parties |
| `@sinkd/runtime` | HTTP/WS server, room registry, sticky routing, SQLite | server, contracts |
| `@sinkd/config` | `sinkd.json` → runtime + wrangler codegen | cli |
| `@sinkd/cli` | init / dev / deploy UX | config, runtime |
| `@sinkd/client` | thin helpers over partysocket | Studio, apps |
| `apps/parties` | Example Chat party | server |
| `apps/studio` | Marketing + live demo UI | runtime via client |
| `deploy/` | Compose + Caddy for celld fleets | operators |

### Boundary rationale

- **contracts** frozen so runtime and server cannot drift on URL shape or tag limits.
- **server** is isomorphic: same class runs under Node runtime or celld Worker adapter.
- **runtime** is the Node stand-in for Durable Objects; **not** a Redis cluster — sticky in-process rooms.
- **Studio** never embeds party logic; it is a client of the public protocol.

## Per-component zoom

### contracts

**Responsibility.** Single source of truth for URL parsing, tag limits, lobby outcomes, health payload shapes.

**State.** None (pure types + pure functions).

**Failure modes.** Parse failures return typed `RouteError`; never throw across process boundaries for bad paths.

**Contracts produced.** `PartyRoute`, `TagPolicy`, `HealthReport`, `SinkdErrorCode`.

### server

**Responsibility.** PartyServer-compatible `Server` abstract class and `Connection` wrapper.

**State.** Connection set + optional `RoomStorage` injected by host runtime.

**Failure modes.** User `onMessage` exceptions → `onError` / `onException`; connection closed on unrecoverable send failure.

**Contracts consumed.** contracts. **Produced.** `Server` subclass surface for apps.

### runtime

**Responsibility.** Accept HTTP/WS, route to room instances, persist storage, enforce lobby hooks.

**State.** `Map<party/room, RoomHandle>`; SQLite per room file.

**Failure modes.** Unknown party → 404; lobby reject → returned status; overloaded room → 503 with Retry-After.

**Observability.** `/healthz`, structured logs.

### cli

**Responsibility.** Project scaffolding, dev server orchestration, deploy artifact / celld wrap.

**Failure modes.** Missing `sinkd.json` → actionable error; celld missing → deploy prints Docker instructions.

### studio

**Responsibility.** Brand-first product surface and live room proof.

**State.** Client-only React state; server state lives in rooms.

## Confidence self-assessment

```
Confidence: high
Residual risks:
  - Node SQLite semantics differ from DO storage structured-clone edge cases
Known gaps:
  - celld Worker adapter is a deploy target stub until Linux probe
```