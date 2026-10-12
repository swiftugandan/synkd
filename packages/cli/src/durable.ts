import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  loadSynkdConfig,
  resolveConfigPath,
  toWranglerJsonc,
} from "@synkd/config";

/** Walk up from start looking for scripts/celld-dev.sh (monorepo layout). */
export function findMonorepoRoot(start: string): string | null {
  let dir = resolve(start);
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, "scripts/celld-dev.sh"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const fromPkg = resolve(here, "../../..");
  if (existsSync(join(fromPkg, "scripts/celld-dev.sh"))) return fromPkg;
  return null;
}

export function runRepoScript(
  repoRoot: string,
  script: string,
  args: string[] = [],
): number {
  const path = join(repoRoot, "scripts", script);
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}`);
  }
  const result = spawnSync("bash", [path, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  return result.status ?? 1;
}

/** Refresh wrangler.jsonc for a project root. */
export function prepareWorkerConfig(project: string): string {
  const configPath = resolveConfigPath(project);
  if (!existsSync(configPath)) {
    throw new Error(`Missing synkd.json in ${project} (run synkd init)`);
  }
  const config = loadSynkdConfig(configPath);
  const wranglerPath = join(dirname(configPath), "wrangler.jsonc");
  writeFileSync(wranglerPath, toWranglerJsonc(config));
  return wranglerPath;
}

/** Start local Durable Objects host (Podman/Docker via monorepo scripts). */
export function startDurableHost(project: string): void {
  const configPath = resolveConfigPath(project);
  if (!existsSync(configPath)) {
    throw new Error(`Missing synkd.json in ${project} (run synkd init)`);
  }
  prepareWorkerConfig(project);

  const repo = findMonorepoRoot(project) ?? findMonorepoRoot(process.cwd());
  if (repo) {
    const code = runRepoScript(repo, "celld-dev.sh", [project]);
    if (code !== 0) process.exitCode = code;
    return;
  }

  console.error(`
Could not find synkd monorepo scripts to start a Durable Objects host.

From the synkd repository:
  synkd up --durable --root ${project}

Or install a native Durable Objects runtime binary and run it in ${project}.
`);
  process.exitCode = 1;
}

export function stopDurableHost(): void {
  const repo = findMonorepoRoot(process.cwd());
  if (!repo) {
    console.error(
      "Run synkd down from the synkd repo (or: podman rm -f synkd-celld-dev)",
    );
    process.exitCode = 1;
    return;
  }
  const code = runRepoScript(repo, "celld-stop.sh");
  if (code !== 0) process.exitCode = code;
}

export function deployToBucket(
  project: string,
  opts: { startFleet?: boolean } = {},
): void {
  if (!process.env.CELLD_BUCKET) {
    console.error(`
Set CELLD_BUCKET to your object-store URL before deploying.

  export CELLD_BUCKET=s3://your-bucket
  export AWS_ACCESS_KEY_ID=…
  export AWS_SECRET_ACCESS_KEY=…
  export AWS_REGION=auto
  synkd deploy --root ${project}
`);
    process.exitCode = 1;
    return;
  }

  prepareWorkerConfig(project);
  const repo = findMonorepoRoot(project) ?? findMonorepoRoot(process.cwd());
  if (!repo) {
    console.error(`
No monorepo deploy scripts found. With a native Durable Objects binary:

  cd ${project}
  celld deploy . --bucket "$CELLD_BUCKET"
`);
    process.exitCode = 1;
    return;
  }

  const code = runRepoScript(repo, "celld-deploy.sh", [project]);
  if (code !== 0) {
    process.exitCode = code;
    return;
  }

  if (opts.startFleet) {
    console.log("\n==> starting fleet (compose)");
    const fleet = spawnSync("bash", [join(repo, "scripts/compose.sh"), "up", "-d"], {
      stdio: "inherit",
      env: process.env,
      cwd: repo,
    });
    if ((fleet.status ?? 1) !== 0) {
      process.exitCode = fleet.status ?? 1;
      return;
    }
    console.log("Fleet is up. Point DNS for SYNKD_SITE at this host.");
    return;
  }

  console.log(`
Artifact pushed to ${process.env.CELLD_BUCKET}.

Start the fleet:
  synkd deploy --root ${project} --start-fleet
  # or: pnpm fleet:up
`);
}
