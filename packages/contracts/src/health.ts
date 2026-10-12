export interface HealthReport {
  readonly ok: true;
  readonly service: "sinkd";
  readonly version: string;
  readonly uptimeMs: number;
  readonly rooms: number;
  readonly connections: number;
}

export function createHealthReport(input: {
  version: string;
  startedAt: number;
  rooms: number;
  connections: number;
}): HealthReport {
  return {
    ok: true,
    service: "sinkd",
    version: input.version,
    uptimeMs: Date.now() - input.startedAt,
    rooms: input.rooms,
    connections: input.connections,
  };
}