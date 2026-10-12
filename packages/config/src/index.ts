import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { partyNameToBinding } from "@synkd/server";

export interface SynkdPartyConfig {
  /** Path to module exporting the Server subclass as default or named export */
  entry: string;
  /** Export name in the entry module (default: default) */
  export?: string;
  /** Override DO binding / class name */
  className?: string;
}

export interface SynkdConfig {
  name: string;
  prefix?: string;
  port?: number;
  host?: string;
  parties: Record<string, SynkdPartyConfig>;
  auth?: {
    /** Shared query/header token (dev convenience) */
    token?: string;
    /** Admin token for /v1 control API (defaults to token if unset) */
    adminToken?: string;
    /** HS256 secret for JWT lobby auth */
    jwtSecret?: string;
    /** Allowed browser Origins; omit to allow all */
    origins?: string[];
  };
  /** Multi-tenant seam — v1 always "default" */
  tenantId?: string;
  cors?: boolean | Record<string, string>;
  storageDir?: string | null;
  compatibilityDate?: string;
  /** Max concurrent sockets per room (default 500) */
  maxConnectionsPerRoom?: number;
}

export function loadSynkdConfig(path: string): SynkdConfig {
  const raw = JSON.parse(readFileSync(path, "utf8")) as SynkdConfig;
  if (!raw.name || !raw.parties || Object.keys(raw.parties).length === 0) {
    throw new Error("synkd.json requires `name` and at least one party");
  }
  return {
    ...raw,
    tenantId: raw.tenantId ?? "default",
  };
}

/**
 * Resolve config path: explicit path, else synkd.json, else deprecated sinkd.json.
 */
export function resolveConfigPath(rootOrFile: string): string {
  const abs = resolve(rootOrFile);
  if (abs.endsWith(".json") && existsSync(abs)) return abs;
  const root = abs.endsWith(".json") ? dirname(abs) : abs;
  const primary = join(root, "synkd.json");
  if (existsSync(primary)) return primary;
  const legacy = join(root, "sinkd.json");
  if (existsSync(legacy)) return legacy;
  return primary;
}

export function toWranglerJsonc(config: SynkdConfig): string {
  const bindings = Object.entries(config.parties).map(([party, partyConfig]) => {
    const className = partyConfig.className ?? partyNameToBinding(party);
    return { name: className, class_name: className };
  });
  const classes = bindings.map((b) => b.class_name);

  const doc = {
    name: config.name,
    main: "src/worker.ts",
    compatibility_date: config.compatibilityDate ?? "2026-01-01",
    durable_objects: { bindings },
    migrations: [{ tag: "v1", new_sqlite_classes: classes }],
  };

  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function bindingMap(config: SynkdConfig): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [party, partyConfig] of Object.entries(config.parties)) {
    map[party] = partyConfig.className ?? partyNameToBinding(party);
  }
  return map;
}