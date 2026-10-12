# Contracts

Frozen TypeScript package: `packages/contracts` (`@synkd/contracts`).

## Serialization

- WebSocket application messages are opaque `string | ArrayBuffer` (PartyKit convention).
- Studio chat demo uses JSON UTF-8 frames: `{ "type": "chat"|"presence"|"system", ... }` — **application-level**, not protocol-level.
- Connection id query param: `_pk`.
- Props header (PartyServer compat): `x-partykit-props` (optional JSON).

## Core types

| Type | Meaning |
| --- | --- |
| `PartyName` | kebab-case URL segment; maps to party binding |
| `RoomId` | opaque string room identity |
| `ConnectionId` | nanoid / client `_pk` |
| `PartyRoute` | `{ prefix, party, room }` from URL |
| `Tag` | string ≤ 256 chars; ≤ 9 per connection |
| `LobbyResult` | `Response` short-circuit \| mutated `Request` \| void |

## Error codes

`ROUTE_NOT_FOUND`, `PARTY_NOT_FOUND`, `LOBBY_REJECTED`, `ROOM_OVERLOADED`, `INVALID_TAG`, `UNAUTHORIZED`, `INTERNAL`.

## Invariants

1. Same `(party, room)` always addresses the same room actor in a process / celld name mapping.
2. Connection id is always present after upgrade completes.
3. Tag lists always include the connection id as the first tag.
4. `broadcast(..., without)` never delivers to listed connection ids.

## Versioning

Package version `0.1.0`. Breaking changes require `contracts/amendment-*` branch and minor/major bump + retag `contracts/vX.Y.Z-frozen`.

## Confidence / freeze gate

```
Confidence: high
Residual risks:
  - Studio message schema may evolve (app contract, not wire protocol)
Known gaps: none
```