import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const cliBin = fileURLToPath(new URL("./bin.ts", import.meta.url));
const root = join(tmpdir(), `synkd-init-dev-${Date.now()}`);

function runCli(args: string[], cwd?: string): Promise<{ code: number; out: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", cliBin, ...args],
      {
        cwd,
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let out = "";
    child.stdout.on("data", (b: Buffer) => {
      out += b.toString();
    });
    child.stderr.on("data", (b: Buffer) => {
      out += b.toString();
    });
    child.on("close", (code) => {
      resolvePromise({ code: code ?? 1, out });
    });
  });
}

describe("synkd init → doctor → dev", () => {
  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("scaffolds a project that serves /healthz", async () => {
    const init = await runCli(["init", root, "--name", "synkd-init-dev"]);
    expect(init.code).toBe(0);
    expect(init.out).toContain("Initialized synkd project");
    expect(existsSync(join(root, "synkd.json"))).toBe(true);
    expect(existsSync(join(root, "node_modules/@synkd/server"))).toBe(true);

    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["@synkd/server"]).toMatch(/^(file:|0\.)/);

    const doc = await runCli(["doctor", "--root", root]);
    expect(doc.code).toBe(0);
    expect(doc.out).toContain("[ok] synkd.json");

    const port = 8800 + Math.floor(Math.random() * 200);
    const child = spawn(
      process.execPath,
      ["--import", "tsx", cliBin, "dev", "--root", root, "--port", String(port), "--no-watch"],
      {
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let boot = "";
    child.stdout.on("data", (b: Buffer) => {
      boot += b.toString();
    });
    child.stderr.on("data", (b: Buffer) => {
      boot += b.toString();
    });

    try {
      let health: Response | undefined;
      for (let i = 0; i < 60; i++) {
        try {
          health = await fetch(`http://127.0.0.1:${port}/healthz`);
          if (health.ok) break;
        } catch {
          /* still booting */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      expect(health?.ok).toBe(true);
      const body = (await health!.json()) as { ok: boolean; service: string };
      expect(body.ok).toBe(true);
      expect(body.service).toBe("synkd");

      const party = await fetch(
        `http://127.0.0.1:${port}/parties/main/init-dev?token=dev-token`,
      );
      expect(party.ok).toBe(true);
    } finally {
      child.kill("SIGTERM");
      await new Promise((r) => child.on("close", r));
    }

    expect(boot).toMatch(/synkd listening/);
  }, 30_000);
});
