# Changelog

## 0.1.0 — unreleased

### Added

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
