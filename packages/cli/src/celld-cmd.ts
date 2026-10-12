import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import { loadSynkdConfig, resolveConfigPath, toWranglerJsonc } from "@synkd/config";
import { writeFileSync } from "node:fs";

/** Walk up from start looking for scripts/celld-dev.sh (monorepo layout). */
export function findMonorepoRoot(start: string): string | null {
  let dir = resolve(start);
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, "scripts/celld-dev.sh"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // CLI package lives at packages/cli — try from package location
  const here = dirname(fileURLToPath(import.meta.url));
  const fromPkg = resolve(here, "../../..");
  if (existsSync(join(fromPkg, "scripts/celld-dev.sh"))) return fromPkg;
  return null;
}

function printWhatIsCelld(): void {
  console.log(`
celld is an open-source runtime that runs Cloudflare Workers and Durable
Objects on your own machines (https://celld.dev).

synkd party classes are isomorphic:
  • synkd dev     → Node runtime (default local DX)
  • synkd celld   → same parties on celld Durable Objects

You need either:
  • Podman (preferred) or Docker — synkd runs the official celld image, or
  • a native celld binary (Linux / ARM64): curl -fsSL https://celld.dev/install.sh | sh
`);
}

function runScript(
  repoRoot: string,
  script: string,
  args: string[],
): void {
  const path = join(repoRoot, "scripts", script);
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}`);
  }
  const result = spawnSync("bash", [path, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

export function registerCelldCommands(program: Command): void {
  const celld = program
    .command("celld")
    .description("Run or deploy parties on celld (Durable Objects host)");

  celld
    .command("info")
    .description("Explain celld and how synkd uses it")
    .action(() => {
      printWhatIsCelld();
      const repo = findMonorepoRoot(process.cwd());
      console.log("In this repo:");
      if (repo) {
        console.log(`  pnpm celld:dev     # local celld on :9876`);
        console.log(`  pnpm celld:stop    # stop local container`);
        console.log(`  pnpm celld:deploy  # push worker to CELLD_BUCKET`);
        console.log(`  Docs: ${join(repo, "apps/site/operators/celld.md")}`);
      } else {
        console.log("  synkd celld prepare --root .");
        console.log("  synkd celld dev --root .     # requires repo scripts or native celld");
      }
    });

  celld
    .command("prepare")
    .description("Write wrangler.jsonc from synkd.json for celld")
    .option("-c, --config <path>", "path to synkd.json", "synkd.json")
    .option("--root <dir>", "project root")
    .action((opts: { config: string; root?: string }) => {
      const configPath = opts.root
        ? resolveConfigPath(resolve(opts.root))
        : resolveConfigPath(resolve(opts.config));
      const root = dirname(configPath);
      const config = loadSynkdConfig(configPath);
      const wranglerPath = join(root, "wrangler.jsonc");
      writeFileSync(wranglerPath, toWranglerJsonc(config));
      console.log(`Wrote ${wranglerPath}`);
      console.log(`Worker entry: ${join(root, "src/worker.ts")}`);
      console.log(`Next: synkd celld dev --root ${root}`);
      console.log(`  or: celld dev   (native binary in ${root})`);
    });

  celld
    .command("dev")
    .description("Start a local celld node for this project (Podman/Docker)")
    .option("--root <dir>", "project root", ".")
    .action((opts: { root: string }) => {
      const project = resolve(opts.root);
      const configPath = resolveConfigPath(project);
      if (!existsSync(configPath)) {
        throw new Error(`Missing synkd.json in ${project} (run synkd init)`);
      }
      // Always refresh wrangler before starting
      const config = loadSynkdConfig(configPath);
      writeFileSync(join(project, "wrangler.jsonc"), toWranglerJsonc(config));

      const repo = findMonorepoRoot(project) ?? findMonorepoRoot(process.cwd());
      if (repo) {
        runScript(repo, "celld-dev.sh", [project]);
        return;
      }

      printWhatIsCelld();
      console.error(`
No monorepo scripts found. Either:

  1) From the synkd repo:  pnpm celld:dev
  2) Native celld:
       cd ${project}
       celld deploy .    # optional bucket
       celld dev
`);
      process.exitCode = 1;
    });

  celld
    .command("stop")
    .description("Stop the local synkd-celld-dev container")
    .action(() => {
      const repo = findMonorepoRoot(process.cwd());
      if (!repo) {
        console.error("Run from the synkd repo (or use: podman rm -f synkd-celld-dev)");
        process.exitCode = 1;
        return;
      }
      runScript(repo, "celld-stop.sh", []);
    });

  celld
    .command("deploy")
    .description("Push the worker artifact to CELLD_BUCKET")
    .option("--root <dir>", "project root", ".")
    .action((opts: { root: string }) => {
      const project = resolve(opts.root);
      const repo = findMonorepoRoot(project) ?? findMonorepoRoot(process.cwd());
      if (!process.env.CELLD_BUCKET) {
        console.error("Set CELLD_BUCKET (e.g. s3://your-bucket) before deploying.");
        process.exitCode = 1;
        return;
      }
      if (repo) {
        runScript(repo, "celld-deploy.sh", [project]);
        return;
      }
      console.error(`
No monorepo scripts found. With a native celld binary:

  cd ${project}
  celld deploy . --bucket "$CELLD_BUCKET"
`);
      process.exitCode = 1;
    });
}
