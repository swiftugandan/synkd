# System context

This view shows the actors outside synkd and the two host options inside.

![System context: browsers and operators reach optional TLS ingress, then Node runtime or celld fleet, both running the same party code.](/architecture/system-context.svg)

## What this shows

1. **Browsers** use Studio or your own partysocket apps.
2. **Operators** use the Console, CLI, and deploy scripts.
3. An optional **TLS ingress** (usually Caddy) terminates HTTPS.
4. Traffic then goes to either the **Node runtime** or a **celld fleet**.
5. Both hosts run the **same party classes** from `@synkd/server`.

## Why it matters

You write party logic once. Local development uses Node. Production fleets can use celld without rewriting application code.

Studio and Console are clients. They do not embed party business logic.

## What to do next

- [Package layers](./package-layers) for the monorepo stack
- [Fleet topology](./fleet-topology) for the celld path
- [Get started for developers](/developers/get-started)
