import type { ConnectionState, ConnectionSetStateFn } from "./types.js";

export interface ConnectionSend {
  (data: string | ArrayBuffer | ArrayBufferView): void;
}

export interface ConnectionClose {
  (code?: number, reason?: string): void;
}

/**
 * PartyServer-compatible connection wrapper around a transport socket.
 */
export class Connection {
  readonly id: string;
  readonly uri: string | null;
  readonly tags: readonly string[];
  /** @deprecated use Server.name */
  server: string;

  #state: ConnectionState = null;
  #send: ConnectionSend;
  #close: ConnectionClose;
  #attachment: unknown = null;

  constructor(opts: {
    id: string;
    uri: string | null;
    tags: readonly string[];
    server: string;
    send: ConnectionSend;
    close: ConnectionClose;
  }) {
    this.id = opts.id;
    this.uri = opts.uri;
    this.tags = opts.tags;
    this.server = opts.server;
    this.#send = opts.send;
    this.#close = opts.close;
  }

  get state(): ConnectionState {
    return this.#state;
  }

  setState<T extends ConnectionState>(
    state: T | ConnectionSetStateFn<T> | null,
  ): ConnectionState {
    if (typeof state === "function") {
      this.#state = state(this.#state as T);
    } else {
      this.#state = state;
    }
    return this.#state;
  }

  send(data: string | ArrayBuffer | ArrayBufferView): void {
    this.#send(data);
  }

  close(code?: number, reason?: string): void {
    this.#close(code, reason);
  }

  /** @deprecated */
  serializeAttachment<T>(attachment: T): void {
    this.#attachment = attachment;
  }

  /** @deprecated */
  deserializeAttachment<T>(): T | null {
    return (this.#attachment as T) ?? null;
  }
}