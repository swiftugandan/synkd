# Operator docs

These pages are for people who install, secure, and run synkd fleets.

## What you will learn

- how to run a local fleet for ops practice
- how to set guest and admin tokens
- how to use the Console
- how to read health and Prometheus metrics
- what celld is and how to run parties on it
- how to put TLS in front of a celld fleet
- what the security model allows and does not allow

## Start here

1. [Get started](./get-started) — run runtime and Console
2. [Configure a fleet](./configure) — `synkd.json` and environment
3. [Run on celld](./celld) — Durable Objects locally or as a fleet
4. [Security](./security) — trust model and tokens

## Related

- Developers: [Developer docs](/developers/)
- System shape: [Architecture](/architecture/) — especially [trust](/architecture/trust-boundaries) and [fleet topology](/architecture/fleet-topology)
- Console: [http://127.0.0.1:5174](http://127.0.0.1:5174) when you run `pnpm dev:console`
