# Architecture

These pages describe how synkd is put together. Read them when you need to place a change, debug a boundary, or explain the system to someone new.

Each diagram is an SVG that uses design tokens. They stay readable in greyscale and on the dark docs theme.

## Dimensions

| Dimension | What it answers |
| --- | --- |
| [System context](./system-context) | Who talks to what at the edge |
| [Package layers](./package-layers) | How packages stack |
| [Request path](./request-path) | What happens to one join |
| [Trust boundaries](./trust-boundaries) | Where trust starts and stops |
| [Control plane](./control-plane) | Guest traffic versus operator `/v1` |
| [Fleet topology](./fleet-topology) | Caddy, celld nodes, object store |

## How to read the diagrams

- A **heavy stroke** marks the important box in a step.
- A **dashed stroke** marks something outside the main process boundary, or a shared durability path.
- Labels under boxes use monospace for package or protocol names.

## Related docs

- Developers: [Compatibility](/developers/compatibility)
- Operators: [Security](/operators/security), [Deploy with TLS](/operators/deploy)
- Deep notes in the repo: `SAD.md`
