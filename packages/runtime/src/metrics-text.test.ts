import { describe, expect, it } from "vitest";
import { formatPrometheusMetrics } from "./metrics-text.js";

describe("formatPrometheusMetrics", () => {
  it("emits counters and gauges", () => {
    const text = formatPrometheusMetrics({
      version: "0.1.0",
      uptimeMs: 1200,
      rooms: 2,
      connections: 4,
      metrics: {
        connects: 5,
        disconnects: 1,
        messages: 9,
        lobbyRejects: 0,
        roomActivations: 2,
        rateLimited: 0,
        httpRequests: 3,
        alarms: 1,
        hibernations: 2,
      },
    });
    expect(text).toContain("sinkd_connections 4");
    expect(text).toContain("sinkd_messages_total 9");
    expect(text).toContain("sinkd_hibernations_total 2");
    expect(text).toContain('sinkd_info{version="0.1.0"} 1');
  });
});