import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import {
  bindingMap,
  loadSinkdConfig,
  toWranglerJsonc,
  type SinkdConfig,
} from "@sinkd/config";
import { createSinkdRuntime } from "@sinkd/runtime";
import type { PartyClass } from "@sinkd/server";

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
    .action(async (opts: { config: string; root?: string; port?: number }) => {
      const root = resolve(opts.root ?? dirname(resolve(opts.config)));
      const configPath = resolve(root, opts.config === "sinkd.json" && opts.root
        ? "sinkd.json"
        : opts.config);
      await runDev(configPath, opts.port);
    });

  program
    .command("deploy")
    .option("-c, --config <path>", "path to sinkd.json", "sinkd.json")
    .action((opts: { config: string }) => {
      deploy(resolve(opts.config));
    });

  await program.parseAsync(argv);
}

function initProject(dir: string, name: string): void {
  mkdirSync(join(dir, "src"), { recursive: true });

  const config: SinkdConfig = {
    name,
    port: 8787,
    parties: {
      main: { entry: "./src/chat.ts", export: "Chat" },
    },
    auth: { token: "dev-token" },
    cors: true,
  };

  writeFileSync(join(dir, "sinkd.json"), `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(join(dir, "wrangler.jsonc"), toWranglerJsonc(config));
  writeFileSync(
    join(dir, "src/chat.ts"),
    `import { Server, type Connection } from "@sinkd/server";

export class Chat extends Server {
  static options = { hibernate: true };

  onConnect(conn: Connection) {
    const roster = [...this.getConnections()].map((c) => c.id);
    this.broadcast(
      JSON.stringify({ type: "system", text: \`\${conn.id} joined\`, roster }),
    );
  }

  onClose(conn: Connection) {
    const roster = [...this.getConnections()]
      .filter((c) => c.id !== conn.id)
      .map((c) => c.id);
    this.broadcast(
      JSON.stringify({ type: "system", text: \`\${conn.id} left\`, roster }),
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
    `/**
 * celld / Cloudflare Worker entry.
 * Deploy with: celld deploy .  (Linux/ARM64 or Docker)
 */
export { default } from "./chat.ts";
`,
  );
  writeFileSync(
    join(dir, "README.md"),
    `# ${name}

\`\`\`sh
sinkd dev
\`\`\`

Connect with partysocket:

\`\`\`ts
new PartySocket({ host: "127.0.0.1:8787", room: "demo", query: { token: "dev-token" } })
\`\`\`
`,
  );

  console.log(`Initialized sinkd project in ${dir}`);
  console.log(`  sinkd dev --root ${dir}`);
}

async function runDev(configPath: string, portOverride?: number): Promise<void> {
  if (!existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath} (run sinkd init)`);
  }
  const root = dirname(configPath);
  const config = loadSinkdConfig(configPath);
  const parties: Record<string, PartyClass> = {};

  // Allow TypeScript party entries under sinkd dev
  const tsx = (await import("tsx/esm/api")) as {
    register: () => () => void;
  };
  tsx.register();

  for (const [party, partyConfig] of Object.entries(config.parties)) {
    const entryPath = resolve(root, partyConfig.entry);
    const mod = (await import(pathToFileURL(entryPath).href)) as Record<
      string,
      PartyClass
    >;
    const exportName = partyConfig.export ?? "default";
    const Party = mod[exportName] ?? mod.default;
    if (!Party) {
      throw new Error(`Party export "${exportName}" not found in ${entryPath}`);
    }
    parties[party] = Party;
  }

  const runtime = createSinkdRuntime({
    parties,
    bindings: bindingMap(config),
    prefix: config.prefix,
    host: config.host ?? "127.0.0.1",
    port: portOverride ?? config.port ?? 8787,
    storageDir: config.storageDir === undefined ? join(root, ".sinkd/rooms") : config.storageDir,
    cors: config.cors ?? true,
    onBeforeConnect: config.auth?.token
      ? (req) => {
          const token = new URL(req.url).searchParams.get("token");
          if (token !== config.auth?.token) {
            return new Response("Unauthorized", { status: 401 });
          }
        }
      : undefined,
  });

  const url = await runtime.listen();
  console.log(`sinkd listening on ${url}`);
  console.log(`  health: ${url}/healthz`);
  console.log(`  party:  ${url}/parties/main/<room>?token=…`);

  const shutdown = async () => {
    await runtime.close();
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
celld is not available on Darwin x86_64. Deploy options:

  1. Docker (Linux image):
       docker run --rm -v "$PWD":/app -w /app ghcr.io/denoland/celld deploy .

  2. Linux / Apple Silicon host with celld installed:
       curl -fsSL https://celld.dev/install.sh | sh
       celld deploy .

See deploy/docker-compose.yml for a multi-node fleet template.
`);
}