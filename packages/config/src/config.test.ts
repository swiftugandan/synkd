import { describe, expect, it } from "vitest";
import { toWranglerJsonc } from "./index.js";

describe("toWranglerJsonc", () => {
  it("emits DO bindings for each party", () => {
    const json = toWranglerJsonc({
      name: "sinkd-chat",
      parties: {
        main: { entry: "./chat.ts" },
        presence: { entry: "./presence.ts", className: "Presence" },
      },
    });
    const parsed = JSON.parse(json) as {
      durable_objects: { bindings: Array<{ name: string }> };
    };
    expect(parsed.durable_objects.bindings.map((b) => b.name)).toEqual([
      "Main",
      "Presence",
    ]);
  });
});