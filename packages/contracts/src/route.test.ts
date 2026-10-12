import { describe, expect, it } from "vitest";
import { parsePartyRoute, partyRoomKey } from "./route.js";

describe("parsePartyRoute", () => {
  it("parses standard party paths", () => {
    const route = parsePartyRoute("/parties/main/demo");
    expect(route).toEqual({
      prefix: "parties",
      party: "main",
      room: "demo",
    });
  });

  it("returns null for non-party paths", () => {
    expect(parsePartyRoute("/healthz")).toBeNull();
    expect(parsePartyRoute("/parties/only-one")).toBeNull();
  });

  it("supports custom prefixes", () => {
    expect(parsePartyRoute("/rooms/chat/lobby", "rooms")?.party).toBe("chat");
  });
});

describe("partyRoomKey", () => {
  it("joins party and room", () => {
    expect(partyRoomKey("main", "demo")).toBe("main/demo");
  });
});