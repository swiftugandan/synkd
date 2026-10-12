# Packages

Install from this monorepo with pnpm workspaces. Published names use the `@synkd/` scope.

## What to import

| Package | Use when you need |
| --- | --- |
| `@synkd/server` | Party `Server` and `Connection` base types |
| `@synkd/client` | Thin partysocket helpers |
| `@synkd/y` | `YjsServer` for y-websocket rooms |
| `@synkd/auth` | Lobby and admin request gates |
| `@synkd/contracts` | URL parsing, tag limits, shared errors |
| `@synkd/config` | Load `synkd.json` |
| `@synkd/runtime` | Embed the Node HTTP and WebSocket host |
| `@synkd/control` | Mount the `/v1` operator API |
| `@synkd/adapter-celld` | Durable Object host for celld |
| `@synkd/cli` | `synkd init`, `dev`, `deploy`, `doctor` |
| `@synkd/ui` | Shared brand tokens for Studio and Console |

## Apps in this repo

| App | Role |
| --- | --- |
| `@synkd/parties` | Example Chat, Presence, and Docs parties |
| `@synkd/studio` | Guest demo UI |
| `@synkd/console` | Operator Console |
| `@synkd/site` | This marketing and documentation site |

## Config file

Prefer `synkd.json`. If it is missing, the CLI still accepts a legacy `sinkd.json` in the same directory.

Environment variables use `SYNKD_*`. Deprecated `SINKD_*` names still work as fallbacks.
