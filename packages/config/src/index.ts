import { readFileSync } from "node:fs";
import { partyNameToBinding } from "@sinkd/server";

export interface SinkdPartyConfig {
  /** Path to module exporting the Server subclass as default or named export */
  entry: string;
  /** Export name in the entry module (default: default) */
  export?: string;
  /** Override DO binding / class name */
  className?: string;
}

export interface SinkdConfig {
  name: string;
  prefix?: string;
  port?: number;
  host?: string;
  parties: Record<string, SinkdPartyConfig>;
  auth?: {
    /** Shared query/header token (dev convenience) */
    token?: string;
    /** HS256 secret for JWT lobby auth */
    jwtSecret?: string;
    /** Allowed browser Origins; omit to allow all */
    origins?: string[];
  };
  cors?: boolean | Record<string, string>;
  storageDir?: string | null;
  compatibilityDate?: string;
  /** Max concurrent sockets per room (default 500) */
  maxConnectionsPerRoom?: number;
}

export function loadSinkdConfig(path: string): SinkdConfig {
  const raw = JSON.parse(readFileSync(path, "utf8")) as SinkdConfig;
  if (!raw.name || !raw.parties || Object.keys(raw.parties).length === 0) {
    throw new Error("sinkd.json requires `name` and at least one party");
  }
  return raw;
}

export function toWranglerJsonc(config: SinkdConfig): string {
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

export function bindingMap(config: SinkdConfig): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [party, partyConfig] of Object.entries(config.parties)) {
    map[party] = partyConfig.className ?? partyNameToBinding(party);
  }
  return map;
}