/** Read SYNKD_* with deprecated SINKD_* fallback. */
export function envString(name: string): string | undefined {
  const synkd = process.env[`SYNKD_${name}`];
  if (synkd !== undefined && synkd !== "") return synkd;
  const legacy = process.env[`SINKD_${name}`];
  if (legacy !== undefined && legacy !== "") return legacy;
  return undefined;
}

export function envFlag(name: string): boolean {
  const v = envString(name);
  return v === "1" || v === "true" || v === "yes";
}