import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { watchPartySources } from "./watch-parties.js";

describe("watchPartySources", () => {
  it("fires on party source change", async () => {
    const root = join(tmpdir(), `synkd-watch-${Date.now()}`);
    mkdirSync(join(root, "src"), { recursive: true });
    const entry = join(root, "src", "chat.ts");
    writeFileSync(entry, "export class Chat {}\n");
    const configPath = join(root, "synkd.json");
    writeFileSync(configPath, '{"name":"t","parties":{"main":{"entry":"./src/chat.ts"}}}');

    const reasons: string[] = [];
    const stop = watchPartySources(
      {
        name: "t",
        parties: { main: { entry: "./src/chat.ts" } },
      },
      root,
      configPath,
      (reason) => {
        reasons.push(reason);
      },
      50,
    );

    await new Promise((r) => setTimeout(r, 40));
    writeFileSync(entry, "export class Chat { /* reload */ }\n");
    await new Promise((r) => setTimeout(r, 200));
    stop();
    rmSync(root, { recursive: true, force: true });

    expect(reasons.length).toBeGreaterThanOrEqual(1);
  });
});