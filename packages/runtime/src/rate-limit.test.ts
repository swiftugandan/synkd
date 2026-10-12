import { describe, expect, it } from "vitest";
import { SlidingWindowLimiter } from "./rate-limit.js";

describe("SlidingWindowLimiter", () => {
  it("allows up to the limit inside the window", () => {
    const limiter = new SlidingWindowLimiter(2, 1000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 1)).toBe(true);
    expect(limiter.allow("a", 2)).toBe(false);
    expect(limiter.allow("a", 1001)).toBe(true);
  });
});