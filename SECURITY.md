# Security

## Trust model (v1)

synkd v1 is a **single-fleet** service: one trust domain per Node process or celld fleet. Do not co-host mutually untrusted tenants on the same fleet. That is a celld / platform constraint, not a temporary limitation we pretend to solve.

## Tokens

| Secret | Where | Purpose |
| --- | --- | --- |
| `auth.token` | `synkd.json` | Guest lobby (Studio / partysocket) |
| `auth.adminToken` | `synkd.json` | Operator Console + `/v1/*` |
| `auth.jwtSecret` | `synkd.json` | Optional HS256 JWTs (`role=admin` for control) |

- Prefer distinct guest vs admin tokens in production.
- Rotate by editing config and rolling the runtime (`synkd dev` hot-reload or process restart).
- Console stores the admin token in `sessionStorage` only — clear via Sign out.
- Never commit production secrets; use env injection / secret stores at deploy time.

## Network

- Terminate TLS at the edge ([`deploy/`](./deploy/)).
- Restrict Console exposure (VPN, private network, or IP allowlist) — `/v1` is powerful (room list, forced hibernate).
- Optional `auth.origins` allowlist for browser Origins.

## What we do not claim

- Hostile multi-tenant isolation inside one celld fleet
- A hosted control plane / preview hosts (PartyKit cloud parity)
- Encryption of room KV at rest beyond what the object store / disk provides

Operator-facing guide: site → [Security](./apps/site/operators/security.md) (`pnpm dev:site`).

Tenancy evolution notes: [`docs/multi-tenant-path.md`](./docs/multi-tenant-path.md).
