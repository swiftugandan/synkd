import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { Server } from "@sinkd/server";
import { createSinkdRuntime, type SinkdRuntime } from "./create-server.js";

class Echo extends Server {
  override onConnect(connection: import("@sinkd/server").Connection) {
    connection.send(JSON.stringify({ type: "welcome", room: this.name }));
  }

  override async onMessage(
    sender: import("@sinkd/server").Connection,
    message: string | ArrayBuffer,
  ) {
    if (typeof message !== "string") return;
    this.broadcast(message, [sender.id]);
  }

  override async onRequest() {
    const count = await this.storage.get<number>("hits");
    const next = (count ?? 0) + 1;
    await this.storage.put("hits", next);
    return Response.json({ ok: true, hits: next, room: this.name });
  }
}

describe("createSinkdRuntime", () => {
  let runtime: SinkdRuntime | undefined;

  afterEach(async () => {
    await runtime?.close();
    runtime = undefined;
  }, 15_000);

  it(
    "broadcasts between two websocket clients and persists HTTP hits",
    async () => {
      runtime = createSinkdRuntime({
        parties: { main: Echo },
        host: "127.0.0.1",
        port: 0,
        storageDir: null,
        onBeforeConnect: (req) => {
          const token = new URL(req.url).searchParams.get("token");
          if (token !== "secret") {
            return new Response("Unauthorized", { status: 401 });
          }
        },
      });
      const base = await runtime.listen();
      const port = Number(new URL(base).port);

      const health = await fetch(`http://127.0.0.1:${port}/healthz`);
      expect(health.status).toBe(200);

      const a = await openSocket(
        `ws://127.0.0.1:${port}/parties/main/demo?token=secret&_pk=a`,
      );
      const b = await openSocket(
        `ws://127.0.0.1:${port}/parties/main/demo?token=secret&_pk=b`,
      );

      expect(JSON.parse(await a.waitForMessage()).type).toBe("welcome");
      expect(JSON.parse(await b.waitForMessage()).type).toBe("welcome");

      const bGot = b.waitForMessage();
      a.send(JSON.stringify({ type: "chat", text: "ping" }));
      expect(JSON.parse(await bGot).text).toBe("ping");

      const hit1 = await fetch(`http://127.0.0.1:${port}/parties/main/demo`);
      const hit2 = await fetch(`http://127.0.0.1:${port}/parties/main/demo`);
      expect((await hit1.json() as { hits: number }).hits).toBe(1);
      expect((await hit2.json() as { hits: number }).hits).toBe(2);

      a.close();
      b.close();
    },
    15_000,
  );

  it("rejects websocket upgrades without lobby token", async () => {
    runtime = createSinkdRuntime({
      parties: { main: Echo },
      host: "127.0.0.1",
      port: 0,
      storageDir: null,
      onBeforeConnect: (req) => {
        if (!new URL(req.url).searchParams.get("token")) {
          return new Response("Unauthorized", { status: 401 });
        }
      },
    });
    const base = await runtime.listen();
    const port = Number(new URL(base).port);

    await expect(
      openSocket(`ws://127.0.0.1:${port}/parties/main/demo`),
    ).rejects.toThrow();
  });
});

type TestSocket = WebSocket & {
  waitForMessage: () => Promise<string>;
};

function openSocket(url: string): Promise<TestSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url) as TestSocket;
    const queue: string[] = [];
    const waiters: Array<(value: string) => void> = [];

    ws.waitForMessage = () =>
      new Promise((msgResolve, msgReject) => {
        const timer = setTimeout(() => msgReject(new Error("timeout")), 5000);
        const deliver = (value: string) => {
          clearTimeout(timer);
          msgResolve(value);
        };
        const next = queue.shift();
        if (next !== undefined) deliver(next);
        else waiters.push(deliver);
      });

    ws.on("message", (data) => {
      const text = data.toString();
      const waiter = waiters.shift();
      if (waiter) waiter(text);
      else queue.push(text);
    });
    ws.once("open", () => resolve(ws));
    ws.once("unexpected-response", (_req, res) => {
      reject(new Error(`unexpected ${res.statusCode}`));
    });
    ws.once("error", reject);
  });
}