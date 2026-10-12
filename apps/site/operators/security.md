# Security

## Trust model (v1)

synkd v1 is a **single-fleet** service. One Node process or one celld fleet is one trust domain.

Do not put mutually untrusted tenants on the same fleet. That limit comes from the celld platform model. synkd does not fake isolation with soft tenancy.

## Tokens

| Secret | Config field | Purpose |
| --- | --- | --- |
| Guest token | `auth.token` | Studio and partysocket lobby |
| Admin token | `auth.adminToken` | Console and `/v1` |
| JWT secret | `auth.jwtSecret` | Optional HS256 tokens (`role=admin` for control) |

Rules:

- Use different guest and admin tokens in production.
- Rotate by changing config and restarting or hot-reloading the runtime.
- Keep production secrets out of git. Inject them at deploy time.
- Console stores the admin token in `sessionStorage` only. Sign out clears it.

## Network

- Terminate TLS at the edge. See [Deploy with TLS](./deploy).
- Restrict Console and `/v1` (VPN, private network, or IP allowlist).
- Set `auth.origins` if you need an Origin allowlist for browsers.

## What we do not claim

- Hostile multi-tenant isolation inside one celld fleet
- A hosted synkd control plane or preview hosts
- Encryption of room storage beyond what your disk or object store provides

## Multi-tenant path

Later versions may key rooms by tenant and honour tenant headers. Until then, run **one fleet per trust boundary**.

Design notes: repository file `docs/multi-tenant-path.md`.

## What to do next

- Review [Configure a fleet](./configure)
- Lock down [Console](./console) exposure
