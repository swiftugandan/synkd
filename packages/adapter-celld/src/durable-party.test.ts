import { describe, expect, it } from "vitest";
import { probeDoCapabilities } from "./durable-party.js";

describe("probeDoCapabilities", () => {
  it("reports userland tags when hibernation APIs are absent", () => {
    const caps = probeDoCapabilities({
      id: { name: "room" },
      storage: {} as never,
    });
    expect(caps).toEqual({
      acceptWebSocket: false,
      getWebSockets: false,
      getTags: false,
      hibernation: false,
    });
  });

  it("detects hibernation acceptWebSocket", () => {
    const caps = probeDoCapabilities({
      id: { name: "room" },
      storage: {} as never,
      acceptWebSocket: () => {},
      getWebSockets: () => [],
      getTags: () => ["a"],
    });
    expect(caps.hibernation).toBe(true);
    expect(caps.getTags).toBe(true);
  });
});
