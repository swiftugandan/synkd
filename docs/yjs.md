# Collaborative docs with `@synkd/y`

`YjsServer` speaks the **y-websocket** binary protocol (sync + awareness) inside a synkd party. Persist encoded ydoc state in room storage; reuse `WebsocketProvider` on the client.

## Server

```ts
import { YjsServer } from "@synkd/y";

export class Docs extends YjsServer {
  static override options = { hibernate: true };
}
```

Register under `parties.docs` in `synkd.json` (see `apps/parties`).

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

Studio Pad surface: `http://127.0.0.1:5173/?surface=pad&room=demo`.

## Notes

- Storage values are JSON-safe (`number[]` of bytes).
- Awareness peers appear in Studio as collaborator pills.
- On celld, the same `Docs` class is wrapped with `createDurableParty(Docs)`.