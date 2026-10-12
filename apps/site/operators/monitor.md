# Monitor health

The Node runtime exposes public health endpoints and an admin control API.

## Public endpoints

### `GET /healthz`

Returns JSON:

- `ok`
- `service` (`synkd`)
- `version`
- `uptimeMs`
- `rooms`
- `connections`
- `metrics` counters

Use this for load balancer health checks.

### `GET /metrics`

Returns Prometheus text. Series names start with `synkd_`, for example `synkd_info` and `synkd_connections`.

Point your scraper at this path. Terminate TLS at the edge if the scrape is remote.

## Admin control API

All `/v1/*` routes need an admin Bearer token.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/health` | Fleet health with tenant context |
| GET | `/v1/rooms` | Warm rooms |
| GET | `/v1/capabilities` | Runtime feature flags |
| GET | `/v1/metrics` | Same Prometheus body as `/metrics` |
| POST | `/v1/rooms/:party/:room/hibernate` | Force unload |

Example:

```sh
curl -s -H "Authorization: Bearer dev-admin" \
  http://127.0.0.1:8787/v1/rooms
```

## Logs

Set:

```sh
export SYNKD_LOG_LEVEL=info
export SYNKD_LOG_JSON=1
```

JSON logs are easier to ship to a log platform.

## What to do next

- Wire scrapes after [Deploy with TLS](./deploy)
- Review [Security](./security) before opening ports
