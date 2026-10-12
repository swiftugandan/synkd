import type { HealthMetrics } from "@synkd/contracts";

/** Prometheus text exposition for scrape-friendly ops. */
export function formatPrometheusMetrics(input: {
  version: string;
  uptimeMs: number;
  rooms: number;
  connections: number;
  metrics: HealthMetrics;
}): string {
  const lines: string[] = [
    `# HELP synkd_info Synkd runtime build info`,
    `# TYPE synkd_info gauge`,
    `synkd_info{version="${escapeLabel(input.version)}"} 1`,
    `# HELP synkd_uptime_ms Process uptime in milliseconds`,
    `# TYPE synkd_uptime_ms gauge`,
    `synkd_uptime_ms ${input.uptimeMs}`,
    `# HELP synkd_rooms Active room actors`,
    `# TYPE synkd_rooms gauge`,
    `synkd_rooms ${input.rooms}`,
    `# HELP synkd_connections Open WebSocket connections`,
    `# TYPE synkd_connections gauge`,
    `synkd_connections ${input.connections}`,
    `# HELP synkd_connects_total WebSocket connects`,
    `# TYPE synkd_connects_total counter`,
    `synkd_connects_total ${input.metrics.connects}`,
    `# HELP synkd_disconnects_total WebSocket disconnects`,
    `# TYPE synkd_disconnects_total counter`,
    `synkd_disconnects_total ${input.metrics.disconnects}`,
    `# HELP synkd_messages_total Inbound WebSocket messages`,
    `# TYPE synkd_messages_total counter`,
    `synkd_messages_total ${input.metrics.messages}`,
    `# HELP synkd_lobby_rejects_total Lobby auth rejects`,
    `# TYPE synkd_lobby_rejects_total counter`,
    `synkd_lobby_rejects_total ${input.metrics.lobbyRejects}`,
    `# HELP synkd_room_activations_total Room activations`,
    `# TYPE synkd_room_activations_total counter`,
    `synkd_room_activations_total ${input.metrics.roomActivations}`,
    `# HELP synkd_rate_limited_total Rate-limit responses`,
    `# TYPE synkd_rate_limited_total counter`,
    `synkd_rate_limited_total ${input.metrics.rateLimited}`,
    `# HELP synkd_http_requests_total Non-health HTTP requests`,
    `# TYPE synkd_http_requests_total counter`,
    `synkd_http_requests_total ${input.metrics.httpRequests}`,
    `# HELP synkd_alarms_total Fired room alarms`,
    `# TYPE synkd_alarms_total counter`,
    `synkd_alarms_total ${input.metrics.alarms}`,
    `# HELP synkd_hibernations_total Idle rooms unloaded from memory`,
    `# TYPE synkd_hibernations_total counter`,
    `synkd_hibernations_total ${input.metrics.hibernations}`,
    "",
  ];
  return lines.join("\n");
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}