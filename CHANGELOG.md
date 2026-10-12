# Changelog

## 0.1.0 — unreleased

### Added

- Node idle-room hibernation (`roomIdleMs`) with SQLite wake; WS close **1012** on runtime drain
- Studio banners for service-restart (1012) vs plain disconnect
- Production-shaped Caddy TLS ingress (`deploy/`) + local `tls internal` overlay
- DO capability probe (`?sinkd_caps=1`) and hibernation `acceptWebSocket` when present
- Live-verified on celld 0.6.2: `getTags` + hibernation APIs present (`tagStrategy=native-do-getTags`)
- Publish metadata (MIT, `publishConfig`) on all `@sinkd/*` packages
- `sinkd dev` hot-reloads party modules and `sinkd.json` (disable with `--no-watch`)
- `@sinkd/runtime` structured logging (`createLogger`, `SINKD_LOG_LEVEL`, `SINKD_LOG_JSON=1`)
- Node alarm scheduler that polls room storage and invokes `Server.onAlarm`
- Prometheus text `/metrics` scrape endpoint
- `@sinkd/y` — `YjsServer` (y-websocket sync + awareness) with durable ydoc persistence
- `docs` party in `@sinkd/parties` (`Docs` / `DocsDO`) for collaborative pads
- Chat room alarm heartbeat (30s) demonstrating Node + celld alarm paths
- Studio **Pad** surface (`?surface=pad`) with Yjs notepad + collaborator awareness
- Studio disconnect banner, online peer count, and heartbeat clock in chat rooms
- Health metrics: `alarms`
- `docs/yjs.md`
- Wrangler migration `v2` for `DocsDO`; Studio Playwright pad e2e
