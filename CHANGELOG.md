# Changelog

## Unreleased

## 0.1.4 — 2026-10-12

### Changed

- Public CLI surface is `init` / `doctor` / `up` / `down` / `deploy`. Durable Objects hosting is `synkd up --durable`, not a separate `celld` command tree
- Studio uses `?backend=durable` (`celld` still accepted as an alias)

### Docs

- Marketing and guides rewritten in plain GDS English for the four-verb CLI
- Documented `synkd.json` as the project config (JSON; no YAML in v1)
- Operator Deploy page covers local Durable Objects and production fleets

## 0.1.3 — 2026-10-12

### Changed

- Replaced experimental `celld:spike` with first-class setup: `celld:dev`, `celld:stop`, `celld:deploy`, `celld:smoke`, `fleet:up`
- Added `synkd celld` CLI (`info` / `prepare` / `dev` / `stop` / `deploy`) and operator guide [Run on celld](./apps/site/operators/celld.md)

### Docs

- Explain what celld is, prerequisites (Podman/Docker or native binary), local vs production fleet paths

## 0.1.2 — 2026-10-12

### Fixed

- Studio HealthStrip: probe celld via a party route (`/` is 404), so `?backend=celld` no longer reports offline when celld is up

## 0.1.1 — 2026-10-12

### Fixed

- `synkd init` / `synkd dev`: link `@synkd/*` from the CLI install so a new project serves parties without an npm publish

### Docs

- Developer CLI guide; get-started covers example stack and CLI project paths

## 0.1.0 — 2026-10-12

### Added

- Marketing + docs site (`@synkd/site`) with developer, operator, and architecture guides
- Architecture SVGs: context, packages, request path, trust, control plane, fleet
- Operator Console (`@synkd/console`) and `/v1` control API
- `@synkd/ui` brand tokens; rename sinkd → synkd (`SYNKD_*` with `SINKD_*` aliases)
- Node idle-room hibernation (`roomIdleMs`) with SQLite wake; WS close **1012** on runtime drain
- Studio banners for service-restart (1012) vs plain disconnect
- Production-shaped Caddy TLS ingress (`deploy/`) + local `tls internal` overlay
- DO capability probe (`?synkd_caps=1`) and hibernation `acceptWebSocket` when present
- Live-verified on celld 0.6.2: `getTags` + hibernation APIs present (`tagStrategy=native-do-getTags`)
- Publish metadata (MIT, `publishConfig`) on all `@synkd/*` packages
- `synkd dev` hot-reloads party modules and `synkd.json` (disable with `--no-watch`)
- `@synkd/runtime` structured logging (`createLogger`, `SYNKD_LOG_LEVEL`, `SYNKD_LOG_JSON=1`)
- Node alarm scheduler that polls room storage and invokes `Server.onAlarm`
- Prometheus text `/metrics` scrape endpoint
- `@synkd/y` — `YjsServer` (y-websocket sync + awareness) with durable ydoc persistence
- `docs` party in `@synkd/parties` (`Docs` / `DocsDO`) for collaborative pads
- Chat room alarm heartbeat (30s) demonstrating Node + celld alarm paths
- Studio **Pad** surface (`?surface=pad`) with Yjs notepad + collaborator awareness
- Studio disconnect banner, online peer count, and heartbeat clock in chat rooms
- Health metrics: `alarms`
- `docs/yjs.md`
- Wrangler migration `v2` for `DocsDO`; Studio Playwright pad e2e
