# Compatibility

synkd aims to keep PartyKit-shaped party code portable. Some platform features differ between Node and a Durable Objects host.

## Runtime matrix

| Capability | Node (`synkd up`) | Durable Objects (`synkd up --durable` / deploy) |
| --- | --- | --- |
| `/parties/:party/:room` | Yes | Yes |
| `onConnect` / `onMessage` / `broadcast` | Yes | Yes |
| Connection tags | Userland on `Connection` | Native `getTags` when the host supports it |
| Hibernatable WebSockets | Idle empty rooms unload | Platform `acceptWebSocket` |
| Close 1012 on move or reload | Yes | Yes (ownership move) |
| Per-room storage | SQLite files | Durable Object storage |
| Alarms | Polled scheduler | DO `alarm()` |
| Yjs | `@synkd/y` | Same party, wrapped for DO |
| `request.cf` geo | Not available | Not available |
| Workers AI / Vectorize | Not a goal | Not a goal |
| partysocket clients | Yes | Yes |

## Platform notes

- Prefer Node for everyday local work. Use Podman or Docker for `synkd up --durable` and production fleets.
- One Durable Objects fleet is one trust domain. Do not co-host hostile tenants on the same fleet. See [Security](/operators/security).

## Probe live capabilities

```sh
synkd up --durable
```

Then:

```sh
curl -s "http://127.0.0.1:9876/parties/main/healthz?token=dev-token&synkd_caps=1"
```

Setup guide: [Deploy](/operators/deploy).

Look for `acceptWebSocket`, `getWebSockets`, and `getTags` in the response.

## Known gaps versus PartyKit cloud

1. No `*.partykit.dev` hosted control plane or preview hosts.
2. No Workers AI or Vectorize bindings.
3. Node storage values are JSON-serialised, not a full structured clone.
4. Multi-tenant SaaS needs separate fleets, not soft tenancy inside one fleet.

## What to do next

- [Deploy with TLS](/operators/deploy) when you are ready for a fleet
- [Deploy](/operators/deploy) for local Durable Objects and fleet setup
