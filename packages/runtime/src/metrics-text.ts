import type { HealthMetrics } from "@sinkd/contracts";

/** Prometheus text exposition for scrape-friendly ops. */
export function formatPrometheusMetrics(input: {
  version: string;
  uptimeMs: number;
  rooms: number;
  connections: number;
  metrics: HealthMetrics;
}): string {
  const lines: string[] = [
    `# HELP sinkd_info Sinkd runtime build info`,
    `# TYPE sinkd_info gauge`,
    `sinkd_info{version="${escapeLabel(input.version)}"} 1`,
    `# HELP sinkd_uptime_ms Process uptime in milliseconds`,
    `# TYPE sinkd_uptime_ms gauge`,
    `sinkd_uptime_ms ${input.uptimeMs}`,
    `# HELP sinkd_rooms Active room actors`,
    `# TYPE sinkd_rooms gauge`,
    `sinkd_rooms ${input.rooms}`,
    `# HELP sinkd_connections Open WebSocket connections`,
    `# TYPE sinkd_connections gauge`,
    `sinkd_connections ${input.connections}`,
    `# HELP sinkd_connects_total WebSocket connects`,
    `# TYPE sinkd_connects_total counter`,
    `sinkd_connects_total ${input.metrics.connects}`,
    `# HELP sinkd_disconnects_total WebSocket disconnects`,
    `# TYPE sinkd_disconnects_total counter`,
    `sinkd_disconnects_total ${input.metrics.disconnects}`,
    `# HELP sinkd_messages_total Inbound WebSocket messages`,
    `# TYPE sinkd_messages_total counter`,
    `sinkd_messages_total ${input.metrics.messages}`,
    `# HELP sinkd_lobby_rejects_total Lobby auth rejects`,
    `# TYPE sinkd_lobby_rejects_total counter`,
    `sinkd_lobby_rejects_total ${input.metrics.lobbyRejects}`,
    `# HELP sinkd_room_activations_total Room activations`,
    `# TYPE sinkd_room_activations_total counter`,
    `sinkd_room_activations_total ${input.metrics.roomActivations}`,
    `# HELP sinkd_rate_limited_total Rate-limit responses`,
    `# TYPE sinkd_rate_limited_total counter`,
    `sinkd_rate_limited_total ${input.metrics.rateLimited}`,
    `# HELP sinkd_http_requests_total Non-health HTTP requests`,
    `# TYPE sinkd_http_requests_total counter`,
    `sinkd_http_requests_total ${input.metrics.httpRequests}`,
    `# HELP sinkd_alarms_total Fired room alarms`,
    `# TYPE sinkd_alarms_total counter`,
    `sinkd_alarms_total ${input.metrics.alarms}`,
    `# HELP sinkd_hibernations_total Idle rooms unloaded from memory`,
    `# TYPE sinkd_hibernations_total counter`,
    `sinkd_hibernations_total ${input.metrics.hibernations}`,
    "",
  ];
  return lines.join("\n");
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}