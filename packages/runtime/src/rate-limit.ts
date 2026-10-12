/** Simple fixed-window counter for room activation DoS mitigation. */
export class SlidingWindowLimiter {
  #hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const prior = this.#hits.get(key)?.filter((t) => t >= cutoff) ?? [];
    if (prior.length >= this.limit) {
      this.#hits.set(key, prior);
      return false;
    }
    prior.push(now);
    this.#hits.set(key, prior);
    return true;
  }
}