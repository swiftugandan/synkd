import { describe, expect, it } from "vitest";
import { toWranglerJsonc } from "./index.js";

describe("toWranglerJsonc", () => {
  it("emits DO bindings for each party", () => {
    const json = toWranglerJsonc({
      name: "synkd-chat",
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

  it("includes DocsDO when docs party is configured", () => {
    const json = toWranglerJsonc({
      name: "synkd-chat",
      parties: {
        main: { entry: "./chat.ts", className: "ChatDO" },
        docs: { entry: "./docs.ts", className: "DocsDO" },
      },
    });
    const parsed = JSON.parse(json) as {
      durable_objects: { bindings: Array<{ name: string }> };
      migrations: Array<{ new_sqlite_classes: string[] }>;
    };
    expect(parsed.durable_objects.bindings.map((b) => b.name)).toContain(
      "DocsDO",
    );
    expect(parsed.migrations[0]?.new_sqlite_classes).toContain("DocsDO");
  });
});