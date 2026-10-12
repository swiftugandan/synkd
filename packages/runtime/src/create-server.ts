import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { join } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { nanoid } from "nanoid";
import {
  CONNECTION_ID_QUERY,
  DEFAULT_PARTY_PREFIX,
  SinkdError,
  SinkdErrorCode,
  createHealthReport,
  parsePartyRoute,
  partyRoomKey,
} from "@sinkd/contracts";
import {
  MemoryStorage,
  partyNameToBinding,
  type PartyClass,
  type PartyServerOptions,
  type Server,
} from "@sinkd/server";
import { applyCors, resolveCorsHeaders } from "./cors.js";
import { SqliteStorage } from "./sqlite-storage.js";

export interface SinkdRuntimeOptions {
  parties: Record<string, PartyClass>;
  /** kebab-case party → PascalCase className overrides */
  bindings?: Record<string, string>;
  prefix?: string;
  host?: string;
  port?: number;
  storageDir?: string | null;
  version?: string;
  maxConnectionsPerRoom?: number;
  cors?: boolean | HeadersInit;
  onBeforeConnect?: PartyServerOptions["onBeforeConnect"];
  onBeforeRequest?: PartyServerOptions["onBeforeRequest"];
  /** Fallback for non-party HTTP routes */
  onFetch?: (request: Request) => Response | Promise<Response>;
}

export interface SinkdRuntime {
  readonly url: string;
  readonly httpServer: HttpServer;
  listen(): Promise<string>;
  close(): Promise<void>;
}

interface RoomHandle {
  server: Server;
  storage: MemoryStorage | SqliteStorage;
}

export function createSinkdRuntime(options: SinkdRuntimeOptions): SinkdRuntime {
  const prefix = options.prefix ?? DEFAULT_PARTY_PREFIX;
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const version = options.version ?? "0.1.0";
  const maxConnections = options.maxConnectionsPerRoom ?? 500;
  const startedAt = Date.now();
  const rooms = new Map<string, RoomHandle>();
  const corsHeaders = resolveCorsHeaders(options.cors ?? true);

  const httpServer = createHttpServer();
  const wss = new WebSocketServer({ noServer: true });

  function classNameFor(party: string): string {
    return options.bindings?.[party] ?? partyNameToBinding(party);
  }

  function getPartyClass(party: string): PartyClass | undefined {
    return options.parties[party] ?? options.parties[classNameFor(party)];
  }

  function getOrCreateRoom(party: string, room: string): RoomHandle {
    const key = partyRoomKey(party, room);
    const existing = rooms.get(key);
    if (existing) return existing;

    const Party = getPartyClass(party);
    if (!Party) {
      throw new SinkdError(
        SinkdErrorCode.PARTY_NOT_FOUND,
        `Unknown party: ${party}`,
        404,
      );
    }

    const storage =
      options.storageDir === null
        ? new MemoryStorage()
        : new SqliteStorage(
            join(options.storageDir ?? ".sinkd/rooms", party, `${room}.sqlite`),
          );

    const server = new Party(room, storage);
    const handle = { server, storage };
    rooms.set(key, handle);
    return handle;
  }

  function countConnections(): number {
    let n = 0;
    for (const room of rooms.values()) n += room.server.connections.size;
    return n;
  }

  async function runLobby(
    kind: "connect" | "request",
    request: Request,
    party: string,
    room: string,
  ): Promise<Request | Response> {
    const lobby = {
      party,
      className: classNameFor(party),
      name: room,
    };
    const hook =
      kind === "connect" ? options.onBeforeConnect : options.onBeforeRequest;
    if (!hook) return request;
    const result = await hook(request, lobby);
    if (result instanceof Response) return result;
    if (result instanceof Request) return result;
    return request;
  }

  httpServer.on("upgrade", (req, socket, head) => {
    void (async () => {
      try {
        const hostHeader = req.headers.host ?? `${host}:${port}`;
        const url = new URL(req.url ?? "/", `http://${hostHeader}`);
        const route = parsePartyRoute(url.pathname, prefix);
        if (!route) {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          socket.destroy();
          return;
        }

        if (!getPartyClass(route.party)) {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
          socket.destroy();
          return;
        }

        const request = nodeToWebRequest(req, url);
        const lobbyResult = await runLobby(
          "connect",
          request,
          route.party,
          route.room,
        );
        if (lobbyResult instanceof Response) {
          socket.write(
            `HTTP/1.1 ${lobbyResult.status} ${lobbyResult.statusText || "Error"}\r\nConnection: close\r\n\r\n`,
          );
          socket.destroy();
          return;
        }

        const handle = getOrCreateRoom(route.party, route.room);
        if (handle.server.connections.size >= maxConnections) {
          socket.write(
            "HTTP/1.1 503 Service Unavailable\r\nRetry-After: 1\r\nConnection: close\r\n\r\n",
          );
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
          void attachSocket(ws, handle.server, lobbyResult, url);
        });
      } catch (error) {
        console.error("[sinkd] upgrade failed", error);
        socket.destroy();
      }
    })();
  });

  httpServer.on("request", (req, res) => {
    void (async () => {
      try {
        const hostHeader = req.headers.host ?? `${host}:${port}`;
        const url = new URL(req.url ?? "/", `http://${hostHeader}`);

        if (req.method === "OPTIONS" && corsHeaders) {
          res.writeHead(204, Object.fromEntries(corsHeaders.entries()));
          res.end();
          return;
        }

        if (url.pathname === "/healthz" || url.pathname === "/health") {
          const body = createHealthReport({
            version,
            startedAt,
            rooms: rooms.size,
            connections: countConnections(),
          });
          const response = applyCors(
            Response.json(body),
            corsHeaders,
          );
          await writeWebResponse(res, response);
          return;
        }

        const route = parsePartyRoute(url.pathname, prefix);
        if (!route) {
          const fallback =
            (await options.onFetch?.(nodeToWebRequest(req, url))) ??
            new Response("Not Found", { status: 404 });
          await writeWebResponse(res, applyCors(fallback, corsHeaders));
          return;
        }

        if (!getPartyClass(route.party)) {
          await writeWebResponse(
            res,
            applyCors(new Response("Party not found", { status: 404 }), corsHeaders),
          );
          return;
        }

        const request = nodeToWebRequest(req, url);
        const lobbyResult = await runLobby(
          "request",
          request,
          route.party,
          route.room,
        );
        if (lobbyResult instanceof Response) {
          await writeWebResponse(res, applyCors(lobbyResult, corsHeaders));
          return;
        }

        const handle = getOrCreateRoom(route.party, route.room);
        const response = await handle.server.handleHttp(lobbyResult);
        await writeWebResponse(res, applyCors(response, corsHeaders));
      } catch (error) {
        console.error("[sinkd] request failed", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    })();
  });

  async function attachSocket(
    ws: WebSocket,
    server: Server,
    request: Request,
    url: URL,
  ): Promise<void> {
    const id = url.searchParams.get(CONNECTION_ID_QUERY) || nanoid();
    const connection = await server.attachConnection({
      id,
      uri: url.toString(),
      request,
      send: (data) => {
        if (ws.readyState === ws.OPEN) ws.send(data);
      },
      close: (code, reason) => {
        ws.close(code, reason);
      },
    });

    ws.on("message", (data, isBinary) => {
      const message = isBinary
        ? toArrayBuffer(data)
        : data.toString();
      void server.receiveMessage(connection.id, message);
    });

    ws.on("close", (code, reason) => {
      void server.detachConnection(
        connection.id,
        code,
        reason.toString(),
        code === 1000,
      );
    });

    ws.on("error", (error) => {
      void server.onError(connection, error);
    });
  }

  let listeningUrl = `http://${host}:${port}`;

  return {
    get url() {
      return listeningUrl;
    },
    httpServer,
    async listen() {
      await new Promise<void>((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, host, () => {
          const address = httpServer.address();
          if (address && typeof address === "object") {
            listeningUrl = `http://${host}:${address.port}`;
          }
          resolve();
        });
      });
      return listeningUrl;
    },
    async close() {
      for (const client of wss.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      for (const room of rooms.values()) {
        if (room.storage instanceof SqliteStorage) room.storage.close();
      }
      rooms.clear();
    },
  };
}

function nodeToWebRequest(
  req: import("node:http").IncomingMessage,
  url: URL,
): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  const method = req.method ?? "GET";
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    // Body streaming for upgrades is unused; HTTP handlers may read via duplex later.
  }
  return new Request(url, init);
}

async function writeWebResponse(
  res: import("node:http").ServerResponse,
  response: Response,
): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

function toArrayBuffer(
  data: Buffer | ArrayBuffer | Buffer[] | ArrayBufferView,
): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).buffer as ArrayBuffer;
  }
  return Uint8Array.from(data).buffer;
}