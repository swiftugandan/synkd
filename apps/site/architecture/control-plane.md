# Control plane

synkd v1 has no hosted control plane. Guest and operator traffic still split into two paths on the same runtime.

![Studio uses /parties with a guest token. Console uses /v1 with an admin token. Both reach one runtime process.](/architecture/control-plane.svg)

## Two paths, one process

| Path | Auth | Purpose |
| --- | --- | --- |
| `/parties/…` | Guest token or JWT | Room joins and party HTTP |
| `/v1/…` | Admin token or admin JWT | Health, rooms, capabilities, hibernate |

The emphasised boxes are the operator path. Use a different secret for them in production.

## What “control plane” means here

In PartyKit cloud, a hosted service manages projects and preview hosts. synkd does not provide that. You run:

- the runtime or celld fleet
- optional Console
- your own CI and DNS

`tenantId` is always `default` in v1. The FleetContext seam exists so a later release can add tenant routing without rewriting Console.

## What to do next

- [Monitor health](/operators/monitor)
- [Use the Console](/operators/console)
- [System context](./system-context)
