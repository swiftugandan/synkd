import { describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  it("emits JSON when enabled", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const log = createLogger({ json: true, level: "info" });
    log.info("room.created", { party: "main", room: "demo" });
    expect(spy).toHaveBeenCalled();
    const line = String(spy.mock.calls[0]?.[0]);
    const parsed = JSON.parse(line) as { msg: string; party: string };
    expect(parsed.msg).toBe("room.created");
    expect(parsed.party).toBe("main");
    spy.mockRestore();
  });
});