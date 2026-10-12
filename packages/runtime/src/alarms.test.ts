import { describe, expect, it, vi } from "vitest";
import { MemoryStorage, Server } from "@synkd/server";
import { AlarmScheduler } from "./alarms.js";
import { createLogger } from "./logger.js";

class AlarmParty extends Server {
  fired = 0;
  override async onAlarm(): Promise<void> {
    this.fired += 1;
  }
}

describe("AlarmScheduler", () => {
  it("fires onAlarm when storage alarm is due", async () => {
    const storage = new MemoryStorage();
    const server = new AlarmParty("r1", storage);
    await storage.setAlarm(Date.now() - 1);
    const log = createLogger({ level: "error", json: true });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const scheduler = new AlarmScheduler(
      () => [{ key: "main/r1", server, storage }],
      log,
    );
    await scheduler.tick();
    expect(server.fired).toBe(1);
    expect(await storage.getAlarm()).toBeNull();
    spy.mockRestore();
  });
});