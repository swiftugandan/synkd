# Package layers

This view stacks packages by responsibility. Higher layers depend on lower ones.

![Package layers from apps through hosts, party API, and foundation, with durable storage outside the process boundary.](/architecture/package-layers.svg)

## What this shows

| Layer | Packages | Role |
| --- | --- | --- |
| Apps | studio, console, site, parties | What people open |
| Hosts | runtime, adapter-celld, cli, control | Process and fleet plumbing |
| Party API | server, y, client, auth | Portable room and client code |
| Foundation | contracts, config, ui | Shared rules and tokens |
| Durable storage | SQLite, DO storage, object store | Persistence outside the app boundary |

## Design rules

- **contracts** freeze URL shape, tag limits, and error codes so hosts cannot drift.
- **server** stays isomorphic: the same class runs under Node or celld.
- **runtime** is the Node stand-in for Durable Objects. It is sticky in-process rooms, not a Redis cluster.
- Storage is dashed because it sits outside the TypeScript package graph.

## What to do next

- [Packages](/developers/packages) for import names
- [Request path](./request-path) for a single join
