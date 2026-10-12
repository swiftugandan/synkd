/**
 * Hidden compatibility aliases for one minor release.
 * Prefer: synkd up --durable, synkd down, synkd deploy.
 */
import { Command } from "commander";
import { resolve } from "node:path";
import {
  deployToBucket,
  prepareWorkerConfig,
  startDurableHost,
  stopDurableHost,
} from "./durable.js";

export function registerCelldCommands(program: Command): void {
  const celld = program
    .command("celld", { hidden: true })
    .description("(hidden) Durable Objects host — use synkd up --durable / synkd deploy");

  celld
    .command("info")
    .description("Explain Durable Objects hosting")
    .action(() => {
      console.log(`
synkd runs parties on Node by default (synkd up).

For a local Durable Objects host:
  synkd up --durable

To ship a fleet to an object store:
  export CELLD_BUCKET=s3://your-bucket
  synkd deploy --start-fleet

The DO engine is an implementation detail; see operator Deploy docs.
`);
    });

  celld
    .command("prepare")
    .option("-c, --config <path>", "path to synkd.json", "synkd.json")
    .option("--root <dir>", "project root")
    .action((opts: { config: string; root?: string }) => {
      const project = resolve(opts.root ?? ".");
      const path = prepareWorkerConfig(project);
      console.log(`Wrote ${path}`);
      console.log(`Next: synkd up --durable --root ${project}`);
    });

  celld
    .command("dev")
    .option("--root <dir>", "project root", ".")
    .action((opts: { root: string }) => {
      startDurableHost(resolve(opts.root));
    });

  celld.command("stop").action(() => {
    stopDurableHost();
  });

  celld
    .command("deploy")
    .option("--root <dir>", "project root", ".")
    .action((opts: { root: string }) => {
      deployToBucket(resolve(opts.root));
    });
}
