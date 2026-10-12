import { describe, expect, it } from "vitest";
import {
  createLobbyAuth,
  signSinkdToken,
  verifySinkdToken,
  USER_HEADER,
} from "./index.js";

describe("sinkd auth", () => {
  it("round-trips JWT claims", async () => {
    const token = await signSinkdToken("test-secret-key", {
      sub: "user-1",
      name: "Ada",
      room: "demo",
    });
    const claims = await verifySinkdToken("test-secret-key", token);
    expect(claims).toMatchObject({ sub: "user-1", name: "Ada", room: "demo" });
  });

  it("accepts shared token and stamps identity", async () => {
    const lobby = createLobbyAuth({ token: "dev-token" });
    const result = await lobby(
      new Request("http://x/parties/main/r?token=dev-token"),
    );
    expect(result).toBeInstanceOf(Request);
    expect((result as Request).headers.get(USER_HEADER)).toBe("shared-token");
  });

  it("rejects bad JWT", async () => {
    const lobby = createLobbyAuth({ jwtSecret: "test-secret-key" });
    const result = await lobby(
      new Request("http://x/parties/main/r?token=not-a-jwt"),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("enforces origin allowlist", async () => {
    const lobby = createLobbyAuth({
      token: "dev-token",
      origins: ["http://127.0.0.1:5173"],
    });
    const result = await lobby(
      new Request("http://x/parties/main/r?token=dev-token", {
        headers: { Origin: "https://evil.example" },
      }),
    );
    expect((result as Response).status).toBe(403);
  });
});