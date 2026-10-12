# Connect clients

Use [partysocket](https://docs.partykit.io/reference/partysocket/) against a synkd host. The path shape matches PartyKit.

## Minimal connection

```ts
import PartySocket from "partysocket";

const socket = new PartySocket({
  host: "127.0.0.1:8787",
  party: "main",
  room: "demo",
  query: { token: "dev-token" },
});

socket.addEventListener("message", (event) => {
  console.log(event.data);
});

socket.send(JSON.stringify({ text: "hello" }));
```

In Studio, Vite proxies `/parties` to the runtime, so the browser can use the Studio host instead of `:8787`.

## Authentication

The lobby gate accepts:

- query `token`
- `Authorization: Bearer …`

Configure the shared guest secret in `synkd.json`:

```json
{
  "auth": {
    "token": "dev-token"
  }
}
```

You can also use HS256 JWTs with `auth.jwtSecret`. Put claims such as `sub`, optional `room` / `party`, and `name` in the token.

Do not put the admin token in guest clients. Admin tokens are for Console and `/v1` only. See [Security](/operators/security).

## Helpers

`@synkd/client` wraps common partysocket options for synkd hosts. Prefer partysocket directly if you already have a client stack.

## Close code 1012

On hot reload, ownership move, or room unload, the server may close sockets with **1012**. partysocket reconnects by default. Keep your UI ready for brief disconnects.

## What to do next

- Try the [Studio](http://127.0.0.1:5173/) chat surface
- Add a [Yjs pad](./collaborative-docs)
