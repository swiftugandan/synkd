import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Packages party projects commonly import (and CLI transitive hosts). */
export const SYNKD_LINK_PACKAGES = [
  "@synkd/server",
  "@synkd/adapter-celld",
  "@synkd/auth",
  "@synkd/cli",
  "@synkd/runtime",
  "@synkd/config",
  "@synkd/contracts",
  "@synkd/y",
] as const;

const INIT_DEPENDENCIES = [
  "@synkd/server",
  "@synkd/adapter-celld",
  "@synkd/auth",
  "@synkd/cli",
] as const;

export function resolveSynkdPackageRoot(name: string): string {
  let resolved: string;
  try {
    resolved = import.meta.resolve(name);
  } catch {
    throw new Error(`Cannot resolve ${name} from the synkd CLI install`);
  }
  let dir = dirname(fileURLToPath(resolved));
  for (;;) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const meta = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
      if (meta.name === name) return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`package.json for ${name} not found from ${resolved}`);
}

/**
 * Symlink @synkd/* packages from the CLI install into the project node_modules.
 * Lets `synkd init` projects run `synkd dev` without a registry publish.
 */
export function ensureSynkdPackageLinks(projectRoot: string): string[] {
  const linked: string[] = [];
  const scopeDir = join(projectRoot, "node_modules", "@synkd");
  mkdirSync(scopeDir, { recursive: true });

  for (const name of SYNKD_LINK_PACKAGES) {
    let pkgRoot: string;
    try {
      pkgRoot = resolveSynkdPackageRoot(name);
    } catch {
      continue;
    }
    const dest = join(scopeDir, name.slice("@synkd/".length));
    const target = resolve(pkgRoot);

    if (existsSync(dest)) {
      try {
        const st = lstatSync(dest);
        if (st.isSymbolicLink()) {
          const current = resolve(dirname(dest), readlinkSync(dest));
          if (realpathSync(current) === realpathSync(target)) continue;
          rmSync(dest, { recursive: true, force: true });
        } else {
          // Real install (npm/pnpm) — do not clobber.
          continue;
        }
      } catch {
        rmSync(dest, { recursive: true, force: true });
      }
    }

    symlinkSync(target, dest, "dir");
    linked.push(name);
  }

  return linked;
}

/** Dependency specs for package.json written by `synkd init`. */
export function synkdDependencySpecs(): Record<string, string> {
  const deps: Record<string, string> = {};
  for (const name of INIT_DEPENDENCIES) {
    try {
      deps[name] = `file:${resolveSynkdPackageRoot(name)}`;
    } catch {
      deps[name] = "0.1.0";
    }
  }
  return deps;
}
