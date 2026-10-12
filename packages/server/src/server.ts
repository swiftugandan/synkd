import { normalizeTags } from "@sinkd/contracts";
import { Connection } from "./connection.js";
import type { RoomStorage } from "./storage.js";
import type {
  ConnectionContext,
  PartyServerOptions,
  WSMessage,
} from "./types.js";

export type PartyClass = new (
  name: string,
  storage: RoomStorage,
  env?: unknown,
) => Server;

export abstract class Server<Env = unknown, Props = Record<string, unknown>> {
  static options: { hibernate?: boolean } = {};

  readonly name: string;
  readonly env: Env;
  readonly storage: RoomStorage;

  #connections = new Map<string, Connection>();
  #started = false;
  #props: Props | undefined;

  constructor(name: string, storage: RoomStorage, env?: Env) {
    this.name = name;
    this.storage = storage;
    this.env = (env ?? {}) as Env;
  }

  get connections(): ReadonlyMap<string, Connection> {
    return this.#connections;
  }

  async ensureStarted(props?: Props): Promise<void> {
    if (this.#started) return;
    this.#started = true;
    this.#props = props;
    await this.onStart(props);
  }

  broadcast(
    msg: string | ArrayBuffer | ArrayBufferView,
    without: string[] = [],
  ): void {
    const excluded = new Set(without);
    for (const [id, conn] of this.#connections) {
      if (excluded.has(id)) continue;
      try {
        conn.send(msg);
      } catch {
        // drop broken sockets; close path will reclaim
      }
    }
  }

  getConnection(id: string): Connection | undefined {
    return this.#connections.get(id);
  }

  *getConnections(tag?: string): Iterable<Connection> {
    for (const conn of this.#connections.values()) {
      if (!tag || conn.tags.includes(tag)) yield conn;
    }
  }

  getConnectionTags(
    _connection: Connection,
    _context: ConnectionContext,
  ): string[] | Promise<string[]> {
    return [];
  }

  onStart(_props?: Props): void | Promise<void> {}

  onConnect(
    _connection: Connection,
    _ctx: ConnectionContext,
  ): void | Promise<void> {}

  onMessage(
    _connection: Connection,
    _message: WSMessage,
  ): void | Promise<void> {}

  onClose(
    _connection: Connection,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): void | Promise<void> {}

  onError(_connection: Connection, _error: unknown): void | Promise<void> {}

  onRequest(_request: Request): Response | Promise<Response> {
    return new Response("Not implemented", { status: 404 });
  }

  onException(_error: unknown): void | Promise<void> {}

  onAlarm(): void | Promise<void> {}

  async attachConnection(opts: {
    id: string;
    uri: string | null;
    request: Request;
    send: (data: string | ArrayBuffer | ArrayBufferView) => void;
    close: (code?: number, reason?: string) => void;
  }): Promise<Connection> {
    await this.ensureStarted(this.#props);
    const ctx: ConnectionContext = { request: opts.request };
    const provisional = new Connection({
      id: opts.id,
      uri: opts.uri,
      tags: [opts.id],
      server: this.name,
      send: opts.send,
      close: opts.close,
    });
    const userTags = await this.getConnectionTags(provisional, ctx);
    const tags = normalizeTags(opts.id, userTags);
    const connection = new Connection({
      id: opts.id,
      uri: opts.uri,
      tags,
      server: this.name,
      send: opts.send,
      close: opts.close,
    });
    this.#connections.set(connection.id, connection);
    try {
      await this.onConnect(connection, ctx);
    } catch (error) {
      await this.onException(error);
      this.#connections.delete(connection.id);
      throw error;
    }
    return connection;
  }

  async detachConnection(
    id: string,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    const connection = this.#connections.get(id);
    if (!connection) return;
    this.#connections.delete(id);
    try {
      await this.onClose(connection, code, reason, wasClean);
    } catch (error) {
      await this.onException(error);
    }
  }

  async receiveMessage(id: string, message: WSMessage): Promise<void> {
    const connection = this.#connections.get(id);
    if (!connection) return;
    try {
      await this.onMessage(connection, message);
    } catch (error) {
      await this.onError(connection, error);
      await this.onException(error);
    }
  }

  async handleHttp(request: Request): Promise<Response> {
    await this.ensureStarted(this.#props);
    try {
      return await this.onRequest(request);
    } catch (error) {
      await this.onException(error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
}

export type { PartyServerOptions };