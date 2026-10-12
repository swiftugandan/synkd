import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SqliteStorage } from "./sqlite-storage.js";

describe("SqliteStorage durability", () => {
  it("survives close and reopen (NFR-DUR-1)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sinkd-dur-"));
    const file = join(dir, "room.sqlite");
    try {
      const a = new SqliteStorage(file);
      await a.put("messageCount", 7);
      await a.put("note", { text: "brine" });
      await a.setAlarm(1_700_000_000_000);
      a.close();

      const b = new SqliteStorage(file);
      expect(await b.get<number>("messageCount")).toBe(7);
      expect(await b.get<{ text: string }>("note")).toEqual({ text: "brine" });
      expect(await b.getAlarm()).toBe(1_700_000_000_000);
      b.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});