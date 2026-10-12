import { watch, type FSWatcher } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SinkdConfig } from "@sinkd/config";

const WATCH_EXT = /\.(ts|tsx|js|mjs|cjs|json)$/;

/**
 * Watch party entry directories + sinkd.json; debounced callback on change.
 * Returns a dispose function.
 */
export function watchPartySources(
  config: SinkdConfig,
  root: string,
  configPath: string,
  onChange: (reason: string) => void,
  debounceMs = 200,
): () => void {
  const dirs = new Set<string>([root]);
  for (const party of Object.values(config.parties)) {
    dirs.add(dirname(resolve(root, party.entry)));
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const kick = (reason: string) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => onChange(reason), debounceMs);
  };

  const watchers: FSWatcher[] = [];
  for (const dir of dirs) {
    try {
      const w = watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) {
          kick(`change in ${dir}`);
          return;
        }
        const name = filename.toString();
        if (name.includes("node_modules") || name.includes(".sinkd")) return;
        if (!WATCH_EXT.test(name) && name !== "sinkd.json") return;
        kick(name);
      });
      watchers.push(w);
    } catch {
      // Some platforms reject recursive watch; fall back to config file only.
    }
  }

  try {
    watchers.push(
      watch(configPath, () => {
        kick("sinkd.json");
      }),
    );
  } catch {
    // ignore
  }

  return () => {
    if (timer) clearTimeout(timer);
    for (const w of watchers) w.close();
  };
}