import { describe, expect, it } from "vitest";
import { createAdminAuth, signSynkdToken } from "./index.js";

describe("createAdminAuth", () => {
  it("accepts admin shared token", async () => {
    const gate = createAdminAuth({ token: "dev-admin" });
    const result = await gate(
      new Request("http://x/v1/rooms", {
        headers: { Authorization: "Bearer dev-admin" },
      }),
    );
    expect(result).toBeInstanceOf(Request);
  });

  it("rejects guest token when admin differs", async () => {
    const gate = createAdminAuth({ token: "dev-admin" });
    const result = await gate(
      new Request("http://x/v1/rooms", {
        headers: { Authorization: "Bearer dev-token" },
      }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("requires role=admin on JWT", async () => {
    const secret = "jwt-secret-key-for-tests";
    const gate = createAdminAuth({ jwtSecret: secret });
    const guest = await signSynkdToken(secret, { sub: "u1", role: "guest" });
    const denied = await gate(
      new Request("http://x/v1/health", {
        headers: { Authorization: `Bearer ${guest}` },
      }),
    );
    expect((denied as Response).status).toBe(403);

    const admin = await signSynkdToken(secret, { sub: "ops", role: "admin" });
    const ok = await gate(
      new Request("http://x/v1/health", {
        headers: { Authorization: `Bearer ${admin}` },
      }),
    );
    expect(ok).toBeInstanceOf(Request);
  });
});
