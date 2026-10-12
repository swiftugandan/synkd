# Collaborative docs

Use `@synkd/y` when several clients must share a Yjs document over the y-websocket protocol.

## Server

```ts
import { YjsServer } from "@synkd/y";

export class Docs extends YjsServer {
  static override options = { hibernate: true };
}
```

Register it as the `docs` party in `synkd.json` (see `apps/parties`).

On a Durable Objects host, wrap the same class with `createDurableParty(Docs)`.

## Client

```ts
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  `ws://${host}/parties/docs`,
  roomId,
  doc,
  { params: { token: "dev-token" }, disableBc: true },
);

const text = doc.getText("pad");
```

## Persist state

`YjsServer` stores encoded document bytes in room storage as JSON-safe number arrays. Empty rooms can hibernate when you set `hibernate: true`.

## Try it in Studio

Open:

[http://127.0.0.1:5173/?surface=pad&room=demo](http://127.0.0.1:5173/?surface=pad&room=demo)

Open the same link in a second tab to confirm sync.

## What to do next

- Read [Compatibility](./compatibility) for Node versus Durable Objects behaviour
- See package details in [Packages](./packages)
