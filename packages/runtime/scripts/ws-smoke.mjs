#!/usr/bin/env node
/**
 * Two-client WebSocket smoke against a sinkd / celld party URL.
 * Usage: node scripts/ws-smoke.mjs [baseHttpUrl]
 * Example: node scripts/ws-smoke.mjs http://127.0.0.1:9876
 */
import WebSocket from "ws";

const base = (
  process.argv.slice(2).find((arg) => arg !== "--") ?? "http://127.0.0.1:8787"
).replace(/\/$/, "");
const token = process.env.SINKD_TOKEN ?? "dev-token";
const room = process.env.SINKD_ROOM ?? `smoke-${Date.now()}`;
const wsBase = base.replace(/^http/, "ws");

function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const queue = [];
    const waiters = [];
    ws.wait = () =>
      new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error(`timeout waiting on ${url}`)), 8000);
        const deliver = (v) => {
          clearTimeout(t);
          res(v);
        };
        const next = queue.shift();
        if (next !== undefined) deliver(next);
        else waiters.push(deliver);
      });
    ws.on("message", (data) => {
      const text = data.toString();
      const w = waiters.shift();
      if (w) w(text);
      else queue.push(text);
    });
    ws.once("open", () => resolve(ws));
    ws.once("unexpected-response", (_req, res) =>
      reject(new Error(`unexpected ${res.statusCode}`)),
    );
    ws.once("error", reject);
  });
}

const a = await open(
  `${wsBase}/parties/main/${room}?token=${encodeURIComponent(token)}&_pk=a`,
);
const b = await open(
  `${wsBase}/parties/main/${room}?token=${encodeURIComponent(token)}&_pk=b`,
);

// Drain join/system frames
await a.wait();
await b.wait();

const pending = b.wait();
a.send(JSON.stringify({ type: "chat", text: "podman-ws-ok", name: "probe" }));
const got = JSON.parse(await pending);
if (got.type !== "chat" || got.text !== "podman-ws-ok") {
  console.error("unexpected frame", got);
  process.exit(1);
}

const http = await fetch(
  `${base}/parties/main/${room}?token=${encodeURIComponent(token)}`,
).then((r) => r.json());

a.close();
b.close();

console.log(
  JSON.stringify({
    ok: true,
    base,
    room,
    broadcast: got.text,
    messageCount: http.messageCount ?? null,
    connectionsAfterClose: http.connections ?? null,
  }),
);