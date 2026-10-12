import { describe, expect, it } from "vitest";
import { normalizeTags } from "./tags.js";
import { SinkdError } from "./errors.js";

describe("normalizeTags", () => {
  it("prepends connection id and dedupes", () => {
    expect(normalizeTags("abc", ["ops", "abc", "ops"])).toEqual([
      "abc",
      "ops",
    ]);
  });

  it("rejects too many tags", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `t${i}`);
    expect(() => normalizeTags("id", tags)).toThrow(SinkdError);
  });

  it("rejects overlong tags", () => {
    expect(() => normalizeTags("id", ["x".repeat(257)])).toThrow(SinkdError);
  });
});