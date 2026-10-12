import { describe, expect, it } from "vitest";
import { Server } from "./server.js";
import { createMemoryPartyNamespace } from "./party-stub.js";

class Echo extends Server {
  override async onRequest(request: Request) {
    const body = await request.text();
    return Response.json({ room: this.name, body });
  }
}

describe("createMemoryPartyNamespace", () => {
  it("routes fetch to a sticky named room", async () => {
    const ns = createMemoryPartyNamespace(Echo);
    const a = await ns.getByName("demo").fetch("http://x/", {
      method: "POST",
      body: "one",
    });
    const b = await ns.getByName("demo").fetch("http://x/", {
      method: "POST",
      body: "two",
    });
    expect(await a.json()).toEqual({ room: "demo", body: "one" });
    expect(await b.json()).toEqual({ room: "demo", body: "two" });
  });
});