# Trust boundaries

This view shows where trust starts. It matches the operator security model.

![Nested trust boundaries: fleet or process (dashed), public edge, untrusted clients, and the room actor.](/architecture/trust-boundaries.svg)

## The three boundaries

1. **Room actor** — trusted party code. Every connection in that room shares the actor and its storage.
2. **Public edge** — TLS, optional Origin allowlist, and lobby auth. Untrusted browsers stop here until authenticated.
3. **Fleet / process** — one trust domain. Bucket credentials and peer overlay on celld are root-equivalent for that fleet.

## Rules that follow

- Do not co-host mutually untrusted tenants on one celld fleet.
- Keep guest tokens and admin tokens separate.
- Treat `/v1` like any other admin API: private network, VPN, or IP allowlist.

## What we do not claim

Hostile multi-tenant isolation inside one fleet. Soft tenancy headers are a later seam, not v1 isolation.

## What to do next

- [Security](/operators/security)
- [Control plane](./control-plane)
