import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Command } from "commander";
import { createLobbyAuth } from "@sinkd/auth";
import {
  bindingMap,
  loadSinkdConfig,
  toWranglerJsonc,
  type SinkdConfig,
} from "@sinkd/config";
import { createSinkdRuntime, type SinkdRuntime } from "@sinkd/runtime";
import { loadParties } from "./load-parties.js";
import { watchPartySources } from "./watch-parties.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("sinkd")
    .description("Self-hosted PartyKit-compatible realtime rooms")
    .version("0.1.0");

  program
    .command("init")
    .argument("[dir]", "project directory", ".")
    .option("-n, --name <name>", "project name", "sinkd-app")
    .action((dir: string, opts: { name: string }) => {
      initProject(resolve(dir), opts.name);
    });

  program
    .command("dev")
    .option("-c, --config <path>", "path to sinkd.json", "sinkd.json")
    .option("--root <dir>", "project root (contains sinkd.json)")
    .option("-p, --port <port>", "port", (v) => Number(v))
    .option("--no-watch", "disable hot reload of party modules")
    .action(
      async (opts: {
        config: string;
        root?: string;
        port?: number;
        watch?: boolean;
      }) => {
        const root = resolve(opts.root ?? process.cwd());
        const configPath = opts.root
          ? resolve(root, "sinkd.json")
          : resolve(opts.config);
        await runDev(configPath, {
          port: opts.port,
          watch: opts.watch !== false,
        });
      },
    );

  program
    .command("deploy")
    .option("-c, --config <path>", "path to sinkd.json", "sinkd.json")
    .action((opts: { config: string }) => {
      deploy(resolve(opts.config));
    });

  program
    .command("doctor")
    .option("-c, --config <path>", "path to sinkd.json", "sinkd.json")
    .option("--root <dir>", "project root")
    .action((opts: { config: string; root?: string }) => {
      const configPath = opts.root
        ? resolve(opts.root, "sinkd.json")
        : resolve(opts.config);
      doctor(configPath);
    });

  await program.parseAsync(argv);
}

function initProject(dir: string, name: string): void {
  mkdirSync(join(dir, "src"), { recursive: true });

  const config: SinkdConfig = {
    name,
    port: 8787,
    parties: {
      main: { entry: "./src/chat.ts", export: "Chat", className: "ChatDO" },
    },
    auth: { token: "dev-token" },
    cors: true,
  };

  writeFileSync(join(dir, "sinkd.json"), `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(join(dir, "wrangler.jsonc"), toWranglerJsonc(config));
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        name,
        private: true,
        type: "module",
        scripts: {
          dev: "sinkd dev",
          deploy: "sinkd deploy",
          doctor: "sinkd doctor",
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(dir, "src/chat.ts"),
    `import { Server, type Connection } from "@sinkd/server";

export class Chat extends Server {
  static options = { hibernate: true };

  onConnect(conn: Connection) {
    this.broadcast(
      JSON.stringify({
        type: "system",
        text: "joined",
        from: conn.id,
        at: Date.now(),
      }),
    );
  }

  async onMessage(sender: Connection, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let parsed: { type?: string; text?: string; name?: string };
    try {
      parsed = JSON.parse(message) as typeof parsed;
    } catch {
      return;
    }
    if (parsed.type === "chat" && parsed.text) {
      this.broadcast(
        JSON.stringify({
          type: "chat",
          text: parsed.text,
          name: parsed.name ?? sender.id.slice(0, 6),
          from: sender.id,
          at: Date.now(),
        }),
      );
    }
  }

  async onRequest() {
    return Response.json({
      ok: true,
      room: this.name,
      connections: this.connections.size,
    });
  }
}

export default Chat;
`,
  );
  writeFileSync(
    join(dir, "src/worker.ts"),
    `import { createDurableParty, routeSinkdRequest } from "@sinkd/adapter-celld";
import { createLobbyAuth } from "@sinkd/auth";
import { Chat } from "./chat.ts";

export const ChatDO = createDurableParty(Chat);

const lobby = createLobbyAuth({ token: "dev-token" });

export default {
  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
    return (
      (await routeSinkdRequest(request, env as never, {
        bindings: { main: "ChatDO" },
        onBeforeConnect: lobby,
        onBeforeRequest: lobby,
      })) ?? new Response("Not Found", { status: 404 })
    );
  },
};
`,
  );
  writeFileSync(
    join(dir, "README.md"),
    `# ${name}

\`\`\`sh
sinkd doctor
sinkd dev
\`\`\`

Connect with partysocket and \`?token=dev-token\`.
`,
  );

  console.log(`Initialized sinkd project in ${dir}`);
  console.log(`  sinkd doctor --root ${dir}`);
  console.log(`  sinkd dev --root ${dir}`);
}

async function runDev(
  configPath: string,
  opts: { port?: number; watch?: boolean } = {},
): Promise<void> {
  if (!existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath} (run sinkd init)`);
  }
  const root = dirname(configPath);

  const tsx = (await import("tsx/esm/api")) as {
    register: () => () => void;
  };
  tsx.register();

  let runtime: SinkdRuntime | undefined;
  let stopWatch: (() => void) | undefined;
  let reloading = false;
  const watchEnabled = opts.watch !== false;

  const boot = async (reason?: string) => {
    const config = loadSinkdConfig(configPath);
    const parties = await loadParties(config, root);
    const lobby = createLobbyAuth({
      token: config.auth?.token,
      jwtSecret: config.auth?.jwtSecret,
      origins: config.auth?.origins,
    });

    const next = createSinkdRuntime({
      parties,
      bindings: bindingMap(config),
      prefix: config.prefix,
      host: config.host ?? "127.0.0.1",
      port: opts.port ?? config.port ?? 8787,
      storageDir:
        config.storageDir === undefined
          ? join(root, ".sinkd/rooms")
          : config.storageDir,
      cors: config.cors ?? true,
      maxConnectionsPerRoom: config.maxConnectionsPerRoom,
      onBeforeConnect: lobby,
      onBeforeRequest: lobby,
    });

    // Close first to free the port (fixed port → would EADDRINUSE otherwise).
    const previous = runtime;
    runtime = undefined;
    if (previous) await previous.close();
    runtime = next;
    const url = await next.listen();

    const partyNames = Object.keys(config.parties);
    const primary = partyNames[0] ?? "main";
    if (reason) {
      console.log(`sinkd reloaded (${reason}) → ${url}`);
    } else {
      console.log(`sinkd listening on ${url}`);
      console.log(`  health:  ${url}/healthz`);
      console.log(`  metrics: ${url}/metrics`);
      console.log(`  party:   ${url}/parties/${primary}/<room>`);
      if (partyNames.length > 1) {
        console.log(`  parties: ${partyNames.join(", ")}`);
      }
      console.log(
        watchEnabled
          ? `  watch:   on (party sources + sinkd.json)`
          : `  watch:   off`,
      );
      if (config.auth?.token) {
        console.log(
          `  auth:    ?token=${config.auth.token} (or Authorization: Bearer …)`,
        );
      }
      if (config.auth?.jwtSecret) {
        console.log(`  auth:    JWT (HS256) via ?token= or Bearer`);
      }
    }
  };

  await boot();

  if (watchEnabled) {
    const config = loadSinkdConfig(configPath);
    stopWatch = watchPartySources(config, root, configPath, (reason) => {
      if (reloading) return;
      reloading = true;
      void boot(reason)
        .catch((error) => {
          console.error(
            "sinkd reload failed:",
            error instanceof Error ? error.message : error,
          );
        })
        .finally(() => {
          reloading = false;
        });
    });
  }

  const shutdown = async () => {
    stopWatch?.();
    await runtime?.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

function deploy(configPath: string): void {
  if (!existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }
  const root = dirname(configPath);
  const config = loadSinkdConfig(configPath);
  const wranglerPath = join(root, "wrangler.jsonc");
  writeFileSync(wranglerPath, toWranglerJsonc(config));
  console.log(`Wrote ${wranglerPath}`);
  console.log(`
Deploy to celld (podman preferred, docker fallback):

  ./scripts/celld-spike.sh
  ./scripts/compose.sh up -d   # set CELLD_BUCKET first

On Linux/ARM64 with a native binary:
  celld deploy ${root}
`);
}

function doctor(configPath: string): void {
  const checks: Array<{ ok: boolean; label: string; detail?: string }> = [];
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  checks.push({
    ok: nodeMajor >= 22,
    label: "Node.js >= 22",
    detail: process.versions.node,
  });

  if (existsSync(configPath)) {
    try {
      const config = loadSinkdConfig(configPath);
      checks.push({ ok: true, label: "sinkd.json", detail: config.name });
      for (const [party, partyConfig] of Object.entries(config.parties)) {
        const entry = resolve(dirname(configPath), partyConfig.entry);
        checks.push({
          ok: existsSync(entry),
          label: `party:${party} entry`,
          detail: partyConfig.entry,
        });
      }
      checks.push({
        ok: Boolean(config.auth?.token || config.auth?.jwtSecret),
        label: "auth configured",
        detail: config.auth?.jwtSecret
          ? "jwt"
          : config.auth?.token
            ? "shared-token"
            : "none (open lobby)",
      });
      const hasDocs = Boolean(config.parties.docs);
      checks.push({
        ok: true,
        label: "yjs docs party",
        detail: hasDocs
          ? "docs — WebsocketProvider → /parties/docs/:room"
          : "optional (add parties.docs + @sinkd/y)",
      });
      checks.push({
        ok: true,
        label: "observability",
        detail: "/healthz JSON · /metrics Prometheus",
      });
    } catch (error) {
      checks.push({
        ok: false,
        label: "sinkd.json parse",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    checks.push({ ok: false, label: "sinkd.json", detail: "missing" });
  }

  checks.push({
    ok: true,
    label: "local runtime",
    detail: "@sinkd/runtime (Node)",
  });

  let celldDetail = "not on PATH (use Docker / Linux / ARM64)";
  try {
    const out = execSync("celld --version", { encoding: "utf8" }).trim();
    celldDetail = out || "found";
  } catch {
    // expected on Darwin x86_64
  }
  checks.push({ ok: true, label: "celld binary", detail: celldDetail });

  for (const check of checks) {
    const mark = check.ok ? "ok" : "!!";
    console.log(
      `[${mark}] ${check.label}${check.detail ? ` — ${check.detail}` : ""}`,
    );
  }

  if (checks.some((c) => !c.ok)) {
    process.exitCode = 1;
  }
}