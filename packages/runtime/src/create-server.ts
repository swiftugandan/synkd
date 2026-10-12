import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { join } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { nanoid } from "nanoid";
import {
  CONNECTION_ID_QUERY,
  DEFAULT_PARTY_PREFIX,
  SynkdError,
  SynkdErrorCode,
  WS_CLOSE_SERVICE_RESTART,
  createHealthReport,
  parsePartyRoute,
  partyRoomKey,
} from "@synkd/contracts";
import {
  handleControlRequest,
  type AdminGate,
  type NodeCapabilities,
  type RoomSnapshot,
  type RuntimeInspector,
} from "@synkd/control";
import {
  MemoryStorage,
  partyNameToBinding,
  type PartyClass,
  type PartyServerOptions,
  type Server,
} from "@synkd/server";
import { AlarmScheduler } from "./alarms.js";
import { applyCors, resolveCorsHeaders } from "./cors.js";
import {
  RoomHibernator,
  partyAllowsHibernate,
  type HibernateRoom,
} from "./hibernate.js";
import { createLogger, type LogLevel, type SynkdLogger } from "./logger.js";
import { formatPrometheusMetrics } from "./metrics-text.js";
import { SlidingWindowLimiter } from "./rate-limit.js";
import { SqliteStorage } from "./sqlite-storage.js";
import { envFlag, envString } from "./env.js";

export interface SynkdRuntimeOptions {
  parties: Record<string, PartyClass>;
  /** kebab-case party → PascalCase className overrides */
  bindings?: Record<string, string>;
  prefix?: string;
  host?: string;
  port?: number;
  storageDir?: string | null;
  version?: string;
  maxConnectionsPerRoom?: number;
  /** Max new room activations per IP per minute (default 60) */
  maxRoomActivationsPerMinute?: number;
  cors?: boolean | HeadersInit;
  onBeforeConnect?: PartyServerOptions["onBeforeConnect"];
  onBeforeRequest?: PartyServerOptions["onBeforeRequest"];
  /** Fallback for non-party HTTP routes */
  onFetch?: (request: Request) => Response | Promise<Response>;
  /** Structured logger (default: createLogger from env) */
  logger?: SynkdLogger;
  logLevel?: LogLevel;
  /** Alarm poll interval ms (default 1000; set 0 to disable) */
  alarmIntervalMs?: number;
  /**
   * Unload empty hibernatable rooms after this idle ms (default 30_000).
   * Set 0 to disable. Parties with `static options.hibernate === false` stay warm.
   */
  roomIdleMs?: number;
  /** Hibernation sweep interval ms (default 5000) */
  hibernateIntervalMs?: number;
  /** Admin gate for /v1 control API (omit to disable /v1) */
  adminAuth?: AdminGate;
  /** Fleet tenant id (v1 default) */
  tenantId?: string;
  /** Optional celld caps from probe file */
  celldCapabilities?: NodeCapabilities["celld"];
}

export interface SynkdRuntime {
  readonly url: string;
  readonly httpServer: HttpServer;
  readonly inspector: RuntimeInspector;
  listen(): Promise<string>;
  close(): Promise<void>;
}

interface RoomHandle extends HibernateRoom {
  server: Server;
  storage: MemoryStorage | SqliteStorage;
  lastActive: number;
  hibernate: boolean;
}

export function createSynkdRuntime(options: SynkdRuntimeOptions): SynkdRuntime {
  const prefix = options.prefix ?? DEFAULT_PARTY_PREFIX;
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const version = options.version ?? "0.1.0";
  const maxConnections = options.maxConnectionsPerRoom ?? 500;
  const activationLimiter = new SlidingWindowLimiter(
    options.maxRoomActivationsPerMinute ?? 60,
    60_000,
  );
  const startedAt = Date.now();
  const rooms = new Map<string, RoomHandle>();
  const corsHeaders = resolveCorsHeaders(options.cors ?? true);
  const log =
    options.logger ??
    createLogger({
      level:
        options.logLevel ??
        (envString("LOG_LEVEL") as LogLevel | undefined) ??
        "info",
      json: envFlag("LOG_JSON"),
    });
  const metrics = {
    connects: 0,
    disconnects: 0,
    messages: 0,
    lobbyRejects: 0,
    roomActivations: 0,
    rateLimited: 0,
    httpRequests: 0,
    alarms: 0,
    hibernations: 0,
  };
  const alarms = new AlarmScheduler(
    () =>
      [...rooms.entries()].map(([key, handle]) => ({
        key,
        server: handle.server,
        storage: handle.storage,
      })),
    {
      info: (msg, fields) => {
        if (msg === "alarm.fired") metrics.alarms += 1;
        log.info(msg, fields);
      },
      debug: log.debug.bind(log),
      warn: log.warn.bind(log),
      error: log.error.bind(log),
    },
  );
  const hibernator = new RoomHibernator(
    () => rooms as Map<string, HibernateRoom>,
    log,
    {
      idleMs: options.roomIdleMs ?? 30_000,
      onHibernate: () => {
        metrics.hibernations += 1;
      },
    },
  );

  const httpServer = createHttpServer();
  const wss = new WebSocketServer({ noServer: true });

  function touch(handle: RoomHandle): void {
    handle.lastActive = Date.now();
  }

  function snapshotHandle(handle: RoomHandle): RoomSnapshot {
    const slash = handle.key.indexOf("/");
    const party = slash >= 0 ? handle.key.slice(0, slash) : "unknown";
    const room = slash >= 0 ? handle.key.slice(slash + 1) : handle.key;
    const tagSet = new Set<string>();
    for (const conn of handle.server.getConnections()) {
      for (const tag of conn.tags) tagSet.add(tag);
    }
    return {
      party,
      room,
      connections: handle.server.connections.size,
      lastActive: handle.lastActive,
      hibernate: handle.hibernate,
      tags: [...tagSet].slice(0, 32),
    };
  }

  async function unloadRoom(key: string): Promise<boolean> {
    const handle = rooms.get(key);
    if (!handle) return false;
    if (handle.server.connections.size > 0) {
      for (const conn of handle.server.getConnections()) {
        try {
          conn.close(WS_CLOSE_SERVICE_RESTART, "hibernate");
        } catch {
          // ignore
        }
      }
    }
    if (handle.storage instanceof SqliteStorage) handle.storage.close();
    rooms.delete(key);
    metrics.hibernations += 1;
    log.info("room.hibernated", { room: key, forced: true });
    return true;
  }

  const inspector: RuntimeInspector = {
    health: () =>
      createHealthReport({
        version,
        startedAt,
        rooms: rooms.size,
        connections: countConnections(),
        metrics: { ...metrics },
      }),
    metricsText: () =>
      formatPrometheusMetrics({
        version,
        uptimeMs: Date.now() - startedAt,
        rooms: rooms.size,
        connections: countConnections(),
        metrics: { ...metrics },
      }),
    listRooms: () => [...rooms.values()].map(snapshotHandle),
    async getRoom(party, room) {
      const handle = rooms.get(partyRoomKey(party, room));
      if (!handle) return null;
      const snap = snapshotHandle(handle);
      const listed = await handle.storage.list({ limit: 500 });
      snap.storageKeys = listed.size;
      snap.nextAlarm = (await handle.storage.getAlarm?.()) ?? null;
      return snap;
    },
    async hibernateRoom(party, room) {
      return unloadRoom(partyRoomKey(party, room));
    },
    capabilities: () => ({
      runtime: "node",
      alarms: true,
      hibernation: (options.roomIdleMs ?? 30_000) > 0,
      metrics: true,
      yjs: Object.keys(options.parties).some(
        (p) => p === "docs" || p.toLowerCase().includes("doc"),
      ),
      celld: options.celldCapabilities,
    }),
  };

  function classNameFor(party: string): string {
    return options.bindings?.[party] ?? partyNameToBinding(party);
  }

  function getPartyClass(party: string): PartyClass | undefined {
    return options.parties[party] ?? options.parties[classNameFor(party)];
  }

  const partyEnv: Record<string, unknown> = {};

  function getOrCreateRoom(
    party: string,
    room: string,
    clientKey: string,
    opts?: { skipRateLimit?: boolean },
  ): RoomHandle {
    const key = partyRoomKey(party, room);
    const existing = rooms.get(key);
    if (existing) {
      touch(existing);
      return existing;
    }

    if (!opts?.skipRateLimit && !activationLimiter.allow(clientKey)) {
      metrics.rateLimited += 1;
      throw new SynkdError(
        SynkdErrorCode.ROOM_OVERLOADED,
        "Room activation rate limit exceeded",
        429,
      );
    }

    const Party = getPartyClass(party);
    if (!Party) {
      throw new SynkdError(
        SynkdErrorCode.PARTY_NOT_FOUND,
        `Unknown party: ${party}`,
        404,
      );
    }

    const storage =
      options.storageDir === null
        ? new MemoryStorage()
        : new SqliteStorage(
            join(options.storageDir ?? ".synkd/rooms", party, `${room}.sqlite`),
          );

    const server = new Party(room, storage, partyEnv);
    const handle: RoomHandle = {
      key,
      server,
      storage,
      lastActive: Date.now(),
      hibernate: partyAllowsHibernate(Party),
    };
    rooms.set(key, handle);
    if (!opts?.skipRateLimit) {
      metrics.roomActivations += 1;
      log.info("room.activated", { party, room, key });
    }
    return handle;
  }

  for (const party of Object.keys(options.parties)) {
    const binding = classNameFor(party);
    partyEnv[binding] = {
      idFromName(name: string) {
        return { toString: () => name, name };
      },
      getByName(name: string) {
        return {
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const handle = getOrCreateRoom(party, name, "internal", {
              skipRateLimit: true,
            });
            const request =
              input instanceof Request ? input : new Request(input, init);
            return handle.server.handleHttp(request);
          },
        };
      },
      get(id: { toString(): string; name?: string }) {
        const name = id.name ?? id.toString();
        return {
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const handle = getOrCreateRoom(party, name, "internal", {
              skipRateLimit: true,
            });
            const request =
              input instanceof Request ? input : new Request(input, init);
            return handle.server.handleHttp(request);
          },
        };
      },
    };
  }

  function clientKeyFrom(
    req: import("node:http").IncomingMessage | Request,
  ): string {
    if (req instanceof Request) {
      return (
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        "local"
      );
    }
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() || "local";
    }
    return req.socket.remoteAddress ?? "local";
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
          metrics.lobbyRejects += 1;
          socket.write(
            `HTTP/1.1 ${lobbyResult.status} ${lobbyResult.statusText || "Error"}\r\nConnection: close\r\n\r\n`,
          );
          socket.destroy();
          return;
        }

        let handle: RoomHandle;
        try {
          handle = getOrCreateRoom(
            route.party,
            route.room,
            clientKeyFrom(req),
          );
        } catch (error) {
          if (error instanceof SynkdError && error.status === 429) {
            socket.write(
              "HTTP/1.1 429 Too Many Requests\r\nRetry-After: 60\r\nConnection: close\r\n\r\n",
            );
            socket.destroy();
            return;
          }
          throw error;
        }
        if (handle.server.connections.size >= maxConnections) {
          socket.write(
            "HTTP/1.1 503 Service Unavailable\r\nRetry-After: 1\r\nConnection: close\r\n\r\n",
          );
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
          void attachSocket(ws, handle, lobbyResult, url);
        });
      } catch (error) {
        log.error("upgrade.failed", {
          error: error instanceof Error ? error.message : String(error),
        });
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
          const response = applyCors(
            Response.json(inspector.health()),
            corsHeaders,
          );
          await writeWebResponse(res, response);
          return;
        }

        if (url.pathname === "/metrics") {
          const response = applyCors(
            new Response(inspector.metricsText(), {
              headers: {
                "content-type": "text/plain; version=0.0.4; charset=utf-8",
              },
            }),
            corsHeaders,
          );
          await writeWebResponse(res, response);
          return;
        }

        if (options.adminAuth && url.pathname.startsWith("/v1")) {
          const control = await handleControlRequest(
            nodeToWebRequest(req, url),
            {
              inspector,
              adminAuth: options.adminAuth,
              tenantId: options.tenantId ?? "default",
            },
          );
          if (control) {
            await writeWebResponse(res, applyCors(control, corsHeaders));
            return;
          }
        }

        metrics.httpRequests += 1;

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
          metrics.lobbyRejects += 1;
          await writeWebResponse(res, applyCors(lobbyResult, corsHeaders));
          return;
        }

        let handle: RoomHandle;
        try {
          handle = getOrCreateRoom(
            route.party,
            route.room,
            clientKeyFrom(req),
          );
        } catch (error) {
          if (error instanceof SynkdError && error.status === 429) {
            await writeWebResponse(
              res,
              applyCors(
                new Response("Too Many Requests", {
                  status: 429,
                  headers: { "Retry-After": "60" },
                }),
                corsHeaders,
              ),
            );
            return;
          }
          throw error;
        }
        const response = await handle.server.handleHttp(lobbyResult);
        await writeWebResponse(res, applyCors(response, corsHeaders));
      } catch (error) {
        log.error("request.failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    })();
  });

  async function attachSocket(
    ws: WebSocket,
    handle: RoomHandle,
    request: Request,
    url: URL,
  ): Promise<void> {
    const { server } = handle;
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
    metrics.connects += 1;
    touch(handle);
    log.debug("ws.connect", { connectionId: id, room: server.name });

    ws.on("message", (data, isBinary) => {
      metrics.messages += 1;
      touch(handle);
      const message = isBinary
        ? toArrayBuffer(data)
        : data.toString();
      void server.receiveMessage(connection.id, message);
    });

    ws.on("close", (code, reason) => {
      metrics.disconnects += 1;
      touch(handle);
      log.debug("ws.close", {
        connectionId: id,
        room: server.name,
        code,
      });
      void server.detachConnection(
        connection.id,
        code,
        reason.toString(),
        code === 1000,
      );
    });

    ws.on("error", (error) => {
      log.warn("ws.error", {
        connectionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      void server.onError(connection, error);
    });
  }

  let listeningUrl = `http://${host}:${port}`;

  return {
    get url() {
      return listeningUrl;
    },
    httpServer,
    inspector,
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
      const interval = options.alarmIntervalMs ?? 1000;
      if (interval > 0) alarms.start(interval);
      const idleMs = options.roomIdleMs ?? 30_000;
      if (idleMs > 0) {
        hibernator.start(options.hibernateIntervalMs ?? 5_000);
      }
      log.info("runtime.listen", {
        url: listeningUrl,
        parties: Object.keys(options.parties),
        alarmIntervalMs: interval,
        roomIdleMs: idleMs,
      });
      return listeningUrl;
    },
    async close() {
      hibernator.stop();
      alarms.stop();
      // 1012 → clients (partysocket) reconnect after ownership / process move
      for (const client of wss.clients) {
        try {
          client.close(WS_CLOSE_SERVICE_RESTART, "synkd restart");
        } catch {
          client.terminate();
        }
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
      log.info("runtime.closed", { url: listeningUrl });
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