import { describe, expect, it } from "vitest";
import type { HealthReport } from "@synkd/contracts";
import type { RuntimeInspector } from "./inspector.js";
import { handleControlRequest } from "./router.js";

function inspector(): RuntimeInspector {
  const health: HealthReport = {
    ok: true,
    service: "synkd",
    version: "0.1.0",
    uptimeMs: 10,
    rooms: 1,
    connections: 2,
    metrics: {
      connects: 2,
      disconnects: 0,
      messages: 1,
      lobbyRejects: 0,
      roomActivations: 1,
      rateLimited: 0,
      httpRequests: 1,
      alarms: 0,
      hibernations: 0,
    },
  };
  return {
    health: () => health,
    metricsText: () => "synkd_info 1\n",
    listRooms: () => [
      {
        party: "main",
        room: "demo",
        connections: 2,
        lastActive: Date.now(),
        hibernate: true,
      },
    ],
    getRoom: async (party, room) =>
      party === "main" && room === "demo"
        ? {
            party,
            room,
            connections: 2,
            lastActive: Date.now(),
            hibernate: true,
            storageKeys: 1,
          }
        : null,
    hibernateRoom: async (party, room) => party === "main" && room === "demo",
    capabilities: () => ({
      runtime: "node",
      alarms: true,
      hibernation: true,
      metrics: true,
      yjs: true,
    }),
  };
}

describe("handleControlRequest", () => {
  it("returns null for non-v1 paths", async () => {
    const res = await handleControlRequest(
      new Request("http://x/healthz"),
      { inspector: inspector(), adminAuth: () => {} },
    );
    expect(res).toBeNull();
  });

  it("rejects when admin auth fails", async () => {
    const res = await handleControlRequest(
      new Request("http://x/v1/rooms"),
      {
        inspector: inspector(),
        adminAuth: () => new Response("Unauthorized", { status: 401 }),
      },
    );
    expect(res?.status).toBe(401);
  });

  it("lists rooms when authorized", async () => {
    const res = await handleControlRequest(
      new Request("http://x/v1/rooms"),
      { inspector: inspector(), adminAuth: () => {} },
    );
    expect(res?.status).toBe(200);
    const body = (await res!.json()) as { rooms: unknown[] };
    expect(body.rooms).toHaveLength(1);
  });
});
