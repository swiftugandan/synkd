# celld fleets

Use celld when you need Durable Object rooms and multi-node ownership. Use the Node runtime for everyday local development.

## When to use which

| Goal | Prefer |
| --- | --- |
| Write and debug parties on a laptop | Node runtime (`pnpm dev`) |
| Sticky multi-node fleet with DO storage | celld + compose |
| Darwin x86_64 without celld binaries | Node locally, Linux containers for fleets |

## Start a spike listener

```sh
pnpm celld:spike
```

This uses Podman when available (or Docker). It deploys the party worker and can print capability probe results.

## Capability probe

```sh
curl -s "http://127.0.0.1:9876/parties/main/probe?token=dev-token&synkd_caps=1"
```

| Field | Meaning |
| --- | --- |
| `capabilities.acceptWebSocket` | Hibernation accept path present |
| `capabilities.getWebSockets` | Platform socket list |
| `capabilities.getTags` | Native per-socket tags |
| `tagStrategy` | Native DO tags versus userland tags |

On celld 0.6.2 these hibernation and tag APIs probe as available.

## Container CLI

Scripts resolve Podman or Docker through `scripts/container-runtime.sh`. Override with `CONTAINER_CLI` if needed.

## Studio against celld

Run the spike, then open Studio with `?backend=celld` once the listener is on `:9876`.

## What to do next

- [Deploy with TLS](./deploy)
- [Developer compatibility](/developers/compatibility)
