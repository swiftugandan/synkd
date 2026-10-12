import { CONNECTION_ID_QUERY } from "@synkd/contracts";
import type { PartyClass, Server } from "@synkd/server";
import { nanoid } from "nanoid";
import { DoStorageAdapter, type DoStorage } from "./do-storage.js";

export interface CelldDurableObjectState {
  readonly id: { readonly name?: string };
  readonly storage: DoStorage;
  acceptWebSocket?(ws: WebSocket, tags?: string[]): void;
  getWebSockets?(tag?: string): WebSocket[];
  getTags?(ws: WebSocket): string[];
}

export type SynkdDoCapabilities = {
  acceptWebSocket: boolean;
  getWebSockets: boolean;
  getTags: boolean;
  /** Prefer hibernation acceptWebSocket when both paths exist */
  hibernation: boolean;
};

export function probeDoCapabilities(
  state: CelldDurableObjectState,
): SynkdDoCapabilities {
  const acceptWebSocket = typeof state.acceptWebSocket === "function";
  const getWebSockets = typeof state.getWebSockets === "function";
  const getTags = typeof state.getTags === "function";
  return {
    acceptWebSocket,
    getWebSockets,
    getTags,
    hibernation: acceptWebSocket,
  };
}

/**
 * Creates a Durable Object class that hosts a synkd Server instance.
 * Compatible with celld / workerd WebSocketPair + optional hibernation APIs.
 */
export function createDurableParty(Party: PartyClass) {
  return class SynkdDurableParty {
    readonly #server: Server;
    readonly #state: CelldDurableObjectState;
    readonly #sockets = new Map<string, WorkersWebSocket>();
    readonly #caps: SynkdDoCapabilities;

    constructor(state: CelldDurableObjectState, env?: unknown) {
      this.#state = state;
      this.#caps = probeDoCapabilities(state);
      const name = state.id.name ?? "default";
      this.#server = new Party(name, new DoStorageAdapter(state.storage), env);
    }

    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);
      if (url.searchParams.get("synkd_caps") === "1") {
        return Response.json({
          ok: true,
          service: "synkd",
          room: this.#server.name,
          capabilities: this.#caps,
          tagStrategy: this.#caps.getTags
            ? "native-do-getTags"
            : "userland-connection-tags",
        });
      }

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

      const connection = await this.#server.attachConnection({
        id,
        uri: url.toString(),
        request,
        send: (data) => {
          if (serverSock.readyState === WebSocket.OPEN) serverSock.send(data);
        },
        close: (code, reason) => serverSock.close(code, reason),
      });

      this.#sockets.set(id, serverSock);

      if (this.#caps.hibernation && this.#state.acceptWebSocket) {
        // Hibernation path: platform owns the socket; tags from Connection.
        this.#state.acceptWebSocket(serverSock, [...connection.tags]);
      } else {
        serverSock.accept();
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
      }

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