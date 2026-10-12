import { describe, expect, it } from "vitest";
import { partyUrl } from "./index.js";

describe("partyUrl", () => {
  it("builds PartyKit-shaped URLs", () => {
    expect(
      partyUrl({
        host: "127.0.0.1:8787",
        room: "demo",
        id: "abc",
        token: "secret",
      }),
    ).toBe(
      "ws://127.0.0.1:8787/parties/main/demo?_pk=abc&token=secret",
    );
  });
});