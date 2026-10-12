# Write a party

A party is a TypeScript class that handles connections to one room. synkd loads it from `synkd.json` and serves it at `/parties/:party/:room`.

## Create a party class

```ts
import { Server, type Connection } from "@synkd/server";

export class Chat extends Server {
  static options = { hibernate: true };

  onConnect(conn: Connection) {
    conn.send(JSON.stringify({ type: "hello", id: conn.id }));
  }

  onMessage(conn: Connection, message: string | ArrayBuffer) {
    this.broadcast(message, [conn.id]);
  }
}
```

Register the export in `synkd.json`:

```json
{
  "parties": {
    "main": {
      "entry": "./src/chat.ts",
      "export": "Chat",
      "className": "ChatDO"
    }
  }
}
```

`className` is used when you deploy to celld (Durable Object class name).

## Room URL

Clients connect to:

```
/parties/<party-key>/<room-id>
```

Example: `/parties/main/lobby-42`.

## Useful Server methods

| Method | Use |
| --- | --- |
| `onConnect` | New WebSocket joined |
| `onMessage` | Client sent data |
| `onClose` | Socket left |
| `broadcast` | Send to others in the room |
| `this.storage` | Per-room durable key/value |
| `this.setAlarm` / `onAlarm` | Delayed work in the room |

Enable idle unload with `static options = { hibernate: true }` when the party can safely wake from storage.

## Hot reload

`synkd dev` (and `pnpm dev` in this repo) watches party source files and reloads them. Active sockets close with code **1012** so clients can reconnect.

Disable watching with `--no-watch` if you need a fixed process for debugging.

## Start from a new project

Use the CLI to scaffold a Chat party, then edit `src/chat.ts`:

```sh
pnpm --filter @synkd/cli exec tsx src/bin.ts init ./my-rooms --name my-rooms
pnpm --filter @synkd/cli exec tsx src/bin.ts dev --root ./my-rooms
```

See [CLI](./cli) for linking, tokens, and deploy.

## What to do next

- [Connect clients](./connect-clients)
- [Collaborative docs](./collaborative-docs) for Yjs
- [Packages](./packages) for import map
