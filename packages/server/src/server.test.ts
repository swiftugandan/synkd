import { describe, expect, it } from "vitest";
import { Server } from "./server.js";
import { MemoryStorage } from "./storage.js";

class Chat extends Server {
  override getConnectionTags() {
    return ["chat"];
  }

  override onMessage(connection: import("./connection.js").Connection, message: string | ArrayBuffer) {
    this.broadcast(typeof message === "string" ? message : "bin", [
      connection.id,
    ]);
  }
}

describe("Server", () => {
  it("broadcasts excluding sender", async () => {
    const room = new Chat("demo", new MemoryStorage());
    const received: string[] = [];

    const a = await room.attachConnection({
      id: "a",
      uri: null,
      request: new Request("http://localhost"),
      send: () => {},
      close: () => {},
    });
    await room.attachConnection({
      id: "b",
      uri: null,
      request: new Request("http://localhost"),
      send: (data) => {
        if (typeof data === "string") received.push(data);
      },
      close: () => {},
    });

    await room.receiveMessage(a.id, "hello");
    expect(received).toEqual(["hello"]);
    expect([...room.getConnections("chat")].map((c) => c.id).sort()).toEqual([
      "a",
      "b",
    ]);
  });
});