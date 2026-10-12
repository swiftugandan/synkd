import { describe, expect, it } from "vitest";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as sync from "y-protocols/sync";
import * as Y from "yjs";
import { MemoryStorage } from "@sinkd/server";
import { YjsServer } from "./yjs-server.js";

const MSG_SYNC = 0;

describe("YjsServer", () => {
  it("persists and restores a text update", async () => {
    const storage = new MemoryStorage();
    const a = new YjsServer("pad-1", storage);
    await a.ensureStarted();
    a.doc.getText("t").insert(0, "hello");
    // allow debounce persist
    await new Promise((r) => setTimeout(r, 300));
    const stored = await storage.get<number[]>("ydoc");
    expect(stored?.length).toBeGreaterThan(0);

    const b = new YjsServer("pad-1", storage);
    await b.ensureStarted();
    expect(b.doc.getText("t").toString()).toBe("hello");
  });

  it("syncs document over y-websocket handshake", async () => {
    const storage = new MemoryStorage();
    const server = new YjsServer("pad-2", storage);
    await server.ensureStarted();
    server.doc.getText("t").insert(0, "x");

    const frames: Uint8Array[] = [];
    const conn = await server.attachConnection({
      id: "c1",
      uri: null,
      request: new Request("http://local/parties/docs/pad-2"),
      send: (data) => {
        if (typeof data === "string") return;
        frames.push(
          data instanceof Uint8Array
            ? data
            : data instanceof ArrayBuffer
              ? new Uint8Array(data)
              : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
        );
      },
      close: () => {},
    });

    expect(frames.length).toBeGreaterThanOrEqual(1);
    const clientDoc = new Y.Doc();

    // Client sends sync step 1 → server replies with missing updates (step 2)
    const clientStep1 = encoding.createEncoder();
    encoding.writeVarUint(clientStep1, MSG_SYNC);
    sync.writeSyncStep1(clientStep1, clientDoc);
    const before = frames.length;
    await server.receiveMessage(conn.id, encoding.toUint8Array(clientStep1));
    expect(frames.length).toBeGreaterThan(before);

    for (const frame of frames.slice(before)) {
      const dec = decoding.createDecoder(frame);
      if (decoding.readVarUint(dec) !== MSG_SYNC) continue;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      sync.readSyncMessage(dec, enc, clientDoc, "client");
    }
    expect(clientDoc.getText("t").toString()).toBe("x");
    await server.detachConnection(conn.id, 1000, "", true);
  });
});