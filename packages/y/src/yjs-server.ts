import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as sync from "y-protocols/sync";
import * as Y from "yjs";
import { Server, type Connection, type WSMessage } from "@sinkd/server";

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const DOC_KEY = "ydoc";

/**
 * PartyServer-compatible Yjs room: y-websocket sync + awareness over binary frames.
 *
 * Client:
 * ```ts
 * new WebsocketProvider(`ws://${host}/parties/docs`, room, doc, { params: { token } })
 * ```
 */
export class YjsServer extends Server {
  /** When true (default), persist encoded ydoc state to room storage. */
  static persist = true;

  readonly doc = new Y.Doc();
  readonly awareness: Awareness;
  #controlled = new WeakMap<object, Set<number>>();

  constructor(name: string, storage: ConstructorParameters<typeof Server>[1], env?: unknown) {
    super(name, storage, env);
    this.awareness = new Awareness(this.doc);
  }

  override async onStart(): Promise<void> {
    const stored = await this.storage.get<number[] | string>(DOC_KEY);
    if (stored) {
      const bytes =
        typeof stored === "string" ? b64ToBytes(stored) : Uint8Array.from(stored);
      Y.applyUpdate(this.doc, bytes);
    }

    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      this.#broadcastSyncUpdate(update, origin);
      if ((this.constructor as typeof YjsServer).persist) {
        void this.#persistDoc();
      }
    });

    this.awareness.on(
      "update",
      (
        {
          added,
          updated,
          removed,
        }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin && typeof origin === "object") {
          let set = this.#controlled.get(origin);
          if (!set) {
            set = new Set();
            this.#controlled.set(origin, set);
          }
          for (const id of added.concat(updated)) set.add(id);
          for (const id of removed) set.delete(id);
        }
        const changed = added.concat(updated, removed);
        if (changed.length === 0) return;
        const encoded = encodeAwarenessUpdate(this.awareness, changed);
        this.#broadcastAwareness(encoded, origin);
      },
    );
  }

  override onConnect(conn: Connection): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    sync.writeSyncStep1(encoder, this.doc);
    conn.send(encoding.toUint8Array(encoder));

    const states = Array.from(this.awareness.getStates().keys());
    if (states.length > 0) {
      const aw = encoding.createEncoder();
      encoding.writeVarUint(aw, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        aw,
        encodeAwarenessUpdate(this.awareness, states),
      );
      conn.send(encoding.toUint8Array(aw));
    }
  }

  override onClose(conn: Connection): void {
    const controlled = this.#controlled.get(conn);
    if (controlled && controlled.size > 0) {
      removeAwarenessStates(this.awareness, Array.from(controlled), null);
    }
  }

  override onMessage(conn: Connection, message: WSMessage): void {
    if (typeof message === "string") return;
    const data =
      message instanceof ArrayBuffer
        ? new Uint8Array(message)
        : message instanceof Uint8Array
          ? message
          : new Uint8Array(
              (message as ArrayBufferView).buffer,
              (message as ArrayBufferView).byteOffset,
              (message as ArrayBufferView).byteLength,
            );
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        sync.readSyncMessage(decoder, encoder, this.doc, conn);
        if (encoding.length(encoder) > 1) {
          conn.send(encoding.toUint8Array(encoder));
        }
        break;
      }
      case MSG_AWARENESS: {
        applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
      }
      default:
        break;
    }
  }

  #broadcastSyncUpdate(update: Uint8Array, origin: unknown): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    sync.writeUpdate(encoder, update);
    const payload = encoding.toUint8Array(encoder);
    for (const c of this.getConnections()) {
      if (c === origin) continue;
      c.send(payload);
    }
  }

  #broadcastAwareness(update: Uint8Array, origin: unknown): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(encoder, update);
    const payload = encoding.toUint8Array(encoder);
    for (const c of this.getConnections()) {
      if (c === origin) continue;
      c.send(payload);
    }
  }

  async #persistDoc(): Promise<void> {
    const state = Y.encodeStateAsUpdate(this.doc);
    // JSON-safe for SqliteStorage / MemoryStorage
    await this.storage.put(DOC_KEY, Array.from(state));
  }
}

export type YjsServerOptions = {
  persist?: boolean;
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}