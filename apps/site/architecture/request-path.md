# Request path

This view follows one client join from the socket to room storage.

![Request path from client through lobby auth and routing into a sticky room actor with KV storage, plus a dashed hibernate reconnect loop.](/architecture/request-path.svg)

## Steps

1. **Client** opens WebSocket or HTTP to `/parties/:party/:room`.
2. **Lobby auth** checks the guest token or JWT.
3. **Route** selects the party module and room id.
4. **Room actor** loads or creates the sticky room (emphasised box).
5. **KV** is the room’s durable storage (SQLite on Node, DO storage on celld).

## Hibernation

If the party allows hibernate and the room goes idle, the host may unload it. Sockets close with code **1012**. Clients should reconnect. partysocket does this by default.

On Node, idle unload closes the SQLite handle. On celld, the platform hibernation APIs apply when available.

## Failure points

| Outcome | Typical cause |
| --- | --- |
| 401 / 403 | Missing or wrong lobby token |
| 404 | Unknown party key |
| 503 | Room overloaded or host draining |

## What to do next

- [Write a party](/developers/write-a-party)
- [Connect clients](/developers/connect-clients)
- [Trust boundaries](./trust-boundaries)
