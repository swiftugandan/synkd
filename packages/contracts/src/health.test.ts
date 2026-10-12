import { describe, expect, it } from "vitest";
import { createHealthReport } from "./health.js";

describe("createHealthReport", () => {
  it("includes metrics defaults", () => {
    const report = createHealthReport({
      version: "0.1.0",
      startedAt: Date.now() - 1000,
      rooms: 2,
      connections: 3,
      metrics: { messages: 9 },
    });
    expect(report.ok).toBe(true);
    expect(report.rooms).toBe(2);
    expect(report.metrics.messages).toBe(9);
    expect(report.metrics.connects).toBe(0);
  });
});