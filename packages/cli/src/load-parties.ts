import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SynkdConfig } from "@synkd/config";
import type { PartyClass } from "@synkd/server";

/** Dynamic-import party modules; `bust` busts ESM cache for hot reload. */
export async function loadParties(
  config: SynkdConfig,
  root: string,
  bust = Date.now(),
): Promise<Record<string, PartyClass>> {
  const parties: Record<string, PartyClass> = {};
  for (const [party, partyConfig] of Object.entries(config.parties)) {
    const entryPath = resolve(root, partyConfig.entry);
    if (!existsSync(entryPath)) {
      throw new Error(`Party entry missing: ${entryPath}`);
    }
    const href = `${pathToFileURL(entryPath).href}?t=${bust}`;
    const mod = (await import(href)) as Record<string, PartyClass>;
    const exportName = partyConfig.export ?? "default";
    const Party = mod[exportName] ?? mod.default;
    if (!Party) {
      throw new Error(`Party export "${exportName}" not found in ${entryPath}`);
    }
    parties[party] = Party;
  }
  return parties;
}