import { CONNECTION_ID_QUERY } from "@sinkd/contracts";
import type { PartyClass, Server } from "@sinkd/server";
import { nanoid } from "nanoid";
import { DoStorageAdapter, type DoStorage } from "./do-storage.js";

export interface CelldDurableObjectState {
  readonly id: { readonly name?: string };
  readonly storage: DoStorage;
  acceptWebSocket?(ws: WebSocket, tags?: string[]): void;
  getWebSockets?(tag?: string): WebSocket[];
}

/**
 * Creates a Durable Object class that hosts a sinkd Server instance.
 * Compatible with celld / workerd WebSocketPair + optional hibernation APIs.
 */
export function createDurableParty(Party: PartyClass) {
  return class SinkdDurableParty {
    readonly #server: Server;
    readonly #sockets = new Map<string, WorkersWebSocket>();

    constructor(state: CelldDurableObjectState, env?: unknown) {
      const name = state.id.name ?? "default";
      this.#server = new Party(name, new DoStorageAdapter(state.storage), env);
    }

    async fetch(request: Request): Promise<Response> {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade?.toLowerCase() === "websocket") {
        return this.#upgrade(request);
      }
      return this.#server.handleHttp(request);
    }

    async webSocketMessage(ws: WorkersWebSocket, message: string | ArrayBuffer) {
      const id = this.#idFor(ws);
      if (!id) return;
      await this.#server.receiveMessage(id, message);
    }

    async webSocketClose(
      ws: WorkersWebSocket,
      code: number,
      reason: string,
      wasClean: boolean,
    ) {
      const id = this.#idFor(ws);
      if (!id) return;
      this.#sockets.delete(id);
      await this.#server.detachConnection(id, code, reason, wasClean);
    }

    async webSocketError(ws: WorkersWebSocket, error: unknown) {
      const id = this.#idFor(ws);
      if (!id) return;
      const conn = this.#server.getConnection(id);
      if (conn) await this.#server.onError(conn, error);
    }

    async alarm() {
      await this.#server.onAlarm();
    }

    async #upgrade(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const id = url.searchParams.get(CONNECTION_ID_QUERY) || nanoid();
      const pair = new WebSocketPair();
      const client = pair[0];
      const serverSock = pair[1];

      serverSock.accept();
      this.#sockets.set(id, serverSock);

      await this.#server.attachConnection({
        id,
        uri: url.toString(),
        request,
        send: (data) => {
          if (serverSock.readyState === WebSocket.OPEN) serverSock.send(data);
        },
        close: (code, reason) => serverSock.close(code, reason),
      });

      serverSock.addEventListener("message", (event) => {
        const data = event.data;
        void this.#server.receiveMessage(
          id,
          typeof data === "string" ? data : (data as ArrayBuffer),
        );
      });
      serverSock.addEventListener("close", (event) => {
        this.#sockets.delete(id);
        void this.#server.detachConnection(
          id,
          event.code,
          event.reason,
          event.wasClean,
        );
      });
      serverSock.addEventListener("error", (event) => {
        const conn = this.#server.getConnection(id);
        if (conn) void this.#server.onError(conn, event);
      });

      return new Response(null, {
        status: 101,
        // @ts-expect-error Workers/celld webSocket response field
        webSocket: client,
      });
    }

    #idFor(ws: WorkersWebSocket): string | undefined {
      for (const [id, sock] of this.#sockets) {
        if (sock === ws) return id;
      }
      return undefined;
    }
  };
}