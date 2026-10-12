# Fleet topology

This view is the production celld layout with TLS at the edge.

![Browser to Caddy on 443, sticky-balanced to celld-a or celld-b, with a shared object store underneath.](/architecture/fleet-topology.svg)

## Pieces

1. **Browser** connects with `wss`.
2. **Caddy** terminates TLS and sets sticky cookie `synkd_lb`.
3. **celld-a** and **celld-b** host Durable Object rooms.
4. An **object store** (R2, S3, GCS, or Azure) holds durable cell state. The dashed line marks shared durability, not a second load-balanced hop.

## Local development

Most day-to-day work uses the Node runtime instead of this topology. Use celld when you need multi-node ownership or platform hibernation.

MinIO is fine for labs. Do not treat it as production durability.

## What to do next

- [Deploy with TLS](/operators/deploy)
- [celld fleets](/operators/celld-fleets)
- [System context](./system-context)
