# Compatibility

synkd aims to keep PartyKit-shaped party code portable. Some platform features differ between Node and celld.

## Runtime matrix

| Capability | Node runtime | celld adapter |
| --- | --- | --- |
| `/parties/:party/:room` | Yes | Yes |
| `onConnect` / `onMessage` / `broadcast` | Yes | Yes |
| Connection tags | Userland on `Connection` | Native `getTags` on celld 0.6.2 |
| Hibernatable WebSockets | Idle empty rooms unload | Platform `acceptWebSocket` |
| Close 1012 on move or reload | Yes | Yes (ownership move) |
| Per-room storage | SQLite files | Durable Object storage |
| Alarms | Polled scheduler | DO `alarm()` |
| Yjs | `@synkd/y` | Same party, wrapped for DO |
| `request.cf` geo | Not available | Not available |
| Workers AI / Vectorize | Not a goal | Not a goal |
| partysocket clients | Yes | Yes |

## Platform notes

- Darwin x86_64 has no celld prebuild. Use the Node runtime locally. Run fleets in Linux containers with Podman (preferred) or Docker.
- On Darwin arm64 and Linux you can install celld from [celld.dev](https://celld.dev/docs/).
- One celld fleet is one trust domain. Do not co-host hostile tenants on the same fleet. See [Security](/operators/security).

## Probe live capabilities

```sh
pnpm celld:spike
```

Or:

```sh
curl -s "http://127.0.0.1:9876/parties/main/probe?token=dev-token&synkd_caps=1"
```

Look for `acceptWebSocket`, `getWebSockets`, and `getTags` in the response.

## Known gaps versus PartyKit cloud

1. No `*.partykit.dev` hosted control plane or preview hosts.
2. No Workers AI or Vectorize bindings.
3. Node storage values are JSON-serialised, not a full structured clone.
4. Multi-tenant SaaS needs separate fleets, not soft tenancy inside one fleet.

## What to do next

- [Deploy with TLS](/operators/deploy) when you are ready for a fleet
- [celld fleets](/operators/celld-fleets) for container topology
