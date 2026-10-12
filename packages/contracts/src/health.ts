export interface HealthMetrics {
  readonly connects: number;
  readonly disconnects: number;
  readonly messages: number;
  readonly lobbyRejects: number;
  readonly roomActivations: number;
  readonly rateLimited: number;
  readonly httpRequests: number;
  readonly alarms: number;
}

export interface HealthReport {
  readonly ok: true;
  readonly service: "sinkd";
  readonly version: string;
  readonly uptimeMs: number;
  readonly rooms: number;
  readonly connections: number;
  readonly metrics: HealthMetrics;
}

export function createHealthReport(input: {
  version: string;
  startedAt: number;
  rooms: number;
  connections: number;
  metrics?: Partial<HealthMetrics>;
}): HealthReport {
  return {
    ok: true,
    service: "sinkd",
    version: input.version,
    uptimeMs: Date.now() - input.startedAt,
    rooms: input.rooms,
    connections: input.connections,
    metrics: {
      connects: input.metrics?.connects ?? 0,
      disconnects: input.metrics?.disconnects ?? 0,
      messages: input.metrics?.messages ?? 0,
      lobbyRejects: input.metrics?.lobbyRejects ?? 0,
      roomActivations: input.metrics?.roomActivations ?? 0,
      rateLimited: input.metrics?.rateLimited ?? 0,
      httpRequests: input.metrics?.httpRequests ?? 0,
      alarms: input.metrics?.alarms ?? 0,
    },
  };
}