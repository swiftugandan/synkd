# Specification

> Claims cite PartyKit docs, PartyServer types, or celld docs. Numbers without provenance include an explicit rationale.

## Problem statement

PartyKit packaged Durable Object rooms behind `/parties/:party/:room` and `partysocket`. The managed `*.partykit.dev` platform is shutting down on a fixed October 2026 schedule; PartyServer on Cloudflare Workers is the official successor, but operators who need self-hosted Durable Objects lack a PartyKit-shaped DX on Deno celld / owned machines. synkd closes that gap.

## Functional requirements

- **FR-1:** Route HTTP and WebSocket traffic for `/{prefix}/:party/:room` (default prefix `parties`) to a sticky room actor.
  - *Source:* [PartyKit how it works](https://docs.partykit.io/how-partykit-works/), PartyServer `routePartykitRequest`.
- **FR-2:** Party classes implement PartyServer lifecycle: `onStart`, `onConnect`, `onMessage`, `onClose`, `onError`, `onRequest`, optional `onAlarm`, optional `getConnectionTags`.
  - *Source:* [Party.Server API](https://docs.partykit.io/reference/partyserver-api/), `partyserver@0.5.x` typings.
- **FR-3:** Support `broadcast(message, without?)`, `getConnection(id)`, `getConnections(tag?)`, connection id via `?_pk=` (server-generated nanoid if absent).
  - *Source:* PartyServer `Server` class; PartySocket `_pk` convention.
- **FR-4:** Connection tags: at most **9** tags, each ≤ **256** characters; connection id is always included as a tag.
  - *Source:* PartyKit / PartyServer connection tag limits.
- **FR-5:** Per-room durable key-value storage survives idle wake / process restart when a storage path is configured.
  - *Source:* [Persisting state](https://docs.partykit.io/guides/persisting-state-into-storage/); celld per-cell SQLite model.
- **FR-6:** Lobby hooks `onBeforeConnect` / `onBeforeRequest` may short-circuit with a `Response` (e.g. 401) before the room wakes.
  - *Source:* PartyServer `PartyServerOptions`.
- **FR-7:** Unmodified `partysocket` clients connect by changing `host` only.
  - *Source:* [PartySocket API](https://docs.partykit.io/reference/partysocket-api/).
- **FR-8:** CLI: `synkd init`, `synkd dev`, `synkd deploy` (deploy wraps celld when available; otherwise emits deploy artifacts).
  - *Rationale:* PartyKit DX parity for self-host operators.
- **FR-9:** Studio web app demonstrates landing + live multi-user room with professional UI/UX.

## Non-functional requirements

### Performance

- **NFR-PERF-1:** Local broadcast fan-out to ≤ 100 connections in a room completes without blocking the event loop beyond one tick batching window (16 ms).
  - *Rationale:* interactive chat SLO; not a published PartyKit guarantee — chosen for local DX.

### Durability & consistency

- **NFR-DUR-1:** With file-backed storage enabled, acknowledged `storage.put` values are readable after process restart.
  - *Source:* celld/PartyKit room storage contract adapted to Node SQLite.
- **NFR-DUR-2:** On celld fleets, durability follows celld `CELLD_DURABILITY` (fleet RPO=0 with ≥2 nodes).
  - *Source:* [celld guarantees](https://celld.dev/docs/).

### Security

- **NFR-SEC-1:** Unauthenticated WebSocket upgrades can be rejected in the lobby before room activation.
  - *Threat:* unauthenticated room wake DoS (OWASP abuse of functionality).
- **NFR-SEC-2:** Origin allowlisting is configurable for browser clients.
- **NFR-SEC-3:** One trust domain per Node process / celld fleet; hostile multi-tenant isolation is out of scope for a single fleet.
  - *Source:* [celld security](https://celld.dev/docs/).

### Observability

- **NFR-OBS-1:** Runtime exposes `GET /healthz` with process health and active room count.
- **NFR-OBS-2:** Structured logs for connect, disconnect, lobby reject, and room errors.

### Operability

- **NFR-OPS-1:** `synkd dev` hot-reloads party modules on change.
- **NFR-OPS-2:** Docker Compose template for celld + TLS ingress documented under `deploy/`.

## Non-goals

- **NG-1:** Cloning `*.partykit.dev` control plane / preview hosts — *because* PartyKit cloud is shutting down; synkd is self-host DX.
- **NG-2:** Workers AI, Vectorize, Hyperdrive, Browser Rendering, Email parity — *because* celld does not implement Cloudflare edge services.
- **NG-3:** Hostile multi-tenant isolation inside one fleet — *because* celld forbids it; use fleet-per-tenant.
- **NG-4:** A new client wire protocol — *because* `partysocket` already works against any WS server with the Party URL shape.
- **NG-5:** Guaranteeing bit-identical Cloudflare DO storage serialization edge cases.

## Constraints

- Local development must work on Darwin x86_64 without a celld binary (none published for that target as of research).
- Node.js ≥ 22 for `node:sqlite` and modern WebSocket APIs.
- TypeScript strict mode across packages.

## Open questions

- [x] Local runtime without celld? → Yes: `@synkd/runtime` (Node).
- [x] Depend on `partyserver` npm for Node? → No — Cloudflare DO base; synkd reimplements compatible surface in `@synkd/server`.
- [x] Exact celld `getTags` support — probed **true** on celld 0.6.2 via Podman (`?synkd_caps=1`); Node still userland tags.

## Confidence self-assessment

```
Confidence: high
Residual risks:
  - celld live path unverified on this host (no Darwin x86_64 binary; Docker daemon down)
  - PartyServer version drift vs partyserver@0.5.x method signatures
Known gaps:
  - none blocking Node DX or celld fleet path (getTags probed on 0.6.2)
```