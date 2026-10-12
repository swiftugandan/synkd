import { describe, expect, it, vi } from "vitest";
import { MemoryStorage, Server } from "@sinkd/server";
import { RoomHibernator, partyAllowsHibernate } from "./hibernate.js";
import { createLogger } from "./logger.js";

class Warm extends Server {
  static override options = { hibernate: false };
}

class Cold extends Server {
  static override options = { hibernate: true };
}

describe("partyAllowsHibernate", () => {
  it("defaults to true when unset", () => {
    expect(partyAllowsHibernate(Server)).toBe(true);
    expect(partyAllowsHibernate(Cold)).toBe(true);
    expect(partyAllowsHibernate(Warm)).toBe(false);
  });
});

describe("RoomHibernator", () => {
  it("unloads empty hibernatable rooms past idle TTL", () => {
    const storage = new MemoryStorage();
    const server = new Cold("r1", storage);
    const rooms = new Map([
      [
        "main/r1",
        {
          key: "main/r1",
          server,
          storage,
          lastActive: Date.now() - 60_000,
          hibernate: true,
        },
      ],
    ]);
    const log = createLogger({ level: "error", json: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const h = new RoomHibernator(() => rooms, log, { idleMs: 30_000 });
    expect(h.tick()).toBe(1);
    expect(rooms.size).toBe(0);
  });

  it("skips rooms with live connections", async () => {
    const storage = new MemoryStorage();
    const server = new Cold("r1", storage);
    await server.attachConnection({
      id: "c1",
      uri: null,
      request: new Request("http://x"),
      send: () => {},
      close: () => {},
    });
    const rooms = new Map([
      [
        "main/r1",
        {
          key: "main/r1",
          server,
          storage,
          lastActive: Date.now() - 60_000,
          hibernate: true,
        },
      ],
    ]);
    const log = createLogger({ level: "error", json: true });
    const h = new RoomHibernator(() => rooms, log, { idleMs: 1 });
    expect(h.tick()).toBe(0);
    expect(rooms.size).toBe(1);
  });
});