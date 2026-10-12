import { describe, expect, it } from "vitest";
import { routeSynkdRequest, type CelldEnv } from "./route.js";

describe("routeSynkdRequest", () => {
  it("returns null for non-party paths", async () => {
    const res = await routeSynkdRequest(
      new Request("http://x/healthz"),
      {} as CelldEnv,
    );
    expect(res).toBeNull();
  });

  it("routes to the DO stub after lobby approval", async () => {
    let sawUrl = "";
    const env: CelldEnv = {
      Main: {
        idFromName: (name) => ({ toString: () => name }),
        get: () => ({
          fetch: async (input) => {
            sawUrl = String(input instanceof Request ? input.url : input);
            return new Response("ok");
          },
        }),
      },
    };

    const res = await routeSynkdRequest(
      new Request("http://x/parties/main/demo"),
      env,
      {
        onBeforeRequest: () => undefined,
      },
    );
    expect(res?.status).toBe(200);
    expect(sawUrl).toContain("/parties/main/demo");
  });

  it("short-circuits lobby rejects", async () => {
    const res = await routeSynkdRequest(
      new Request("http://x/parties/main/demo"),
      {
        Main: {
          idFromName: () => ({ toString: () => "x" }),
          get: () => ({
            fetch: async () => new Response("should not run"),
          }),
        },
      },
      {
        onBeforeConnect: async () => new Response("nope", { status: 401 }),
      },
    );
    // HTTP path uses onBeforeRequest; connect hook unused — verify request hook:
    const blocked = await routeSynkdRequest(
      new Request("http://x/parties/main/demo"),
      {
        Main: {
          idFromName: () => ({ toString: () => "x" }),
          get: () => ({
            fetch: async () => new Response("should not run"),
          }),
        },
      },
      {
        onBeforeRequest: async () => new Response("nope", { status: 401 }),
      },
    );
    expect(blocked?.status).toBe(401);
    expect(res?.status).toBe(200);
  });
});