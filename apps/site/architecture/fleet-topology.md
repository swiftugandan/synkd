# Fleet topology

This view is the production Durable Objects layout with TLS at the edge.

![Browser to Caddy on 443, sticky-balanced to durable nodes, with a shared object store underneath.](/architecture/fleet-topology.svg)

## Pieces

1. **Browser** connects with `wss`.
2. **Caddy** terminates TLS and sets sticky cookie `synkd_lb`.
3. **Durable Object nodes** host rooms.
4. An **object store** (R2, S3, GCS, or Azure) holds durable cell state. The dashed line marks shared durability, not a second load-balanced hop.

## Local development

Most day-to-day work uses the Node runtime (`synkd up`). Use `synkd up --durable` or a full fleet when you need Durable Object storage or multi-node ownership.

MinIO is fine for labs. Do not treat it as production durability.

## What to do next

- [Deploy](/operators/deploy)
- [System context](./system-context)
