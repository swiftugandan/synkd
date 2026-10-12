# Configure a fleet

synkd reads project config from `synkd.json` (or legacy `sinkd.json`).

## Minimal example

```json
{
  "name": "synkd-chat",
  "port": 8787,
  "host": "127.0.0.1",
  "parties": {
    "main": {
      "entry": "./src/chat.ts",
      "export": "Chat",
      "className": "ChatDO"
    }
  },
  "auth": {
    "token": "dev-token",
    "adminToken": "dev-admin"
  },
  "tenantId": "default",
  "cors": true,
  "storageDir": ".synkd/rooms"
}
```

## Important fields

| Field | Purpose |
| --- | --- |
| `parties` | Map of party key → source entry and export |
| `auth.token` | Guest lobby shared secret |
| `auth.adminToken` | Operator Console and `/v1` |
| `auth.jwtSecret` | Optional HS256 JWT verification |
| `auth.origins` | Optional browser Origin allowlist |
| `tenantId` | Always `default` in v1 |
| `storageDir` | Node SQLite room files |
| `port` / `host` | Node listen address |

## Environment overrides

Prefer `SYNKD_*` names. Deprecated `SINKD_*` names still work if the new name is unset.

Common flags:

| Variable | Effect |
| --- | --- |
| `SYNKD_LOG_LEVEL` | Log verbosity |
| `SYNKD_LOG_JSON=1` | Structured JSON logs |
| `SYNKD_SITE` | Public hostname for TLS Caddy compose |

## Multi-tenant note

v1 is a single fleet with `tenantId = "default"`. Non-default tenants on the control API return `501` until a later release. Plan for **one fleet per trust boundary**. See [Security](./security).

## What to do next

- [Use the Console](./console)
- [Deploy with TLS](./deploy)
