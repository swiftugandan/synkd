# Multi-tenant pathway

v1 ships **single fleet / `tenantId = "default"`**. This document is the seam for a later multi-tenant product without rewriting Console or party apps.

## Current seams

| Layer | v1 | Later |
| --- | --- | --- |
| Config | `tenantId: "default"` in `synkd.json` | per-tenant config or control-plane DB |
| Control API | `FleetContext` on every `/v1` handler; non-default → `501` | honor `x-synkd-tenant` (or path prefix) |
| Room identity | `(party, room)` | `(tenantId, party, room)` in keys + storage paths |
| Auth | fleet admin token | org-scoped JWT / API keys |
| celld | one fleet = one trust domain | **fleet-per-tenant** (required for isolation) |

## What celld cannot do

celld forbids hostile multi-tenant isolation inside one fleet. synkd will not fake it with soft tenancy on shared Durable Object storage. Multi-tenant SaaS means **many fleets** (or equivalent hard isolation), not many logical tenants on one celld cluster.

## Migration sketch

1. Keep `/v1/rooms` shapes; add tenant filter server-side.
2. Prefix SQLite paths: `.synkd/rooms/{tenantId}/{party}/{room}.sqlite`.
3. Lobby JWT gains `tenant` claim; reject cross-tenant room joins.
4. Console becomes org-aware; Studio remains guest-facing per tenant host/subdomain.

Until then, operators run one synkd fleet per trust boundary.
