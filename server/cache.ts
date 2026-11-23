/** A value with the time it was produced. */
interface Entry<T> {
  readonly value: T;
  readonly at: number;
}

/**
 * Time-based cache that serves the last good value when a refresh fails,
 * so a flaky upstream (data.gov.in often returns 502) never blanks the app.
 */
export class StaleCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Fresh value if cached recently, else load; on load failure fall back to the stale value. */
  async get(
    key: string,
    load: () => Promise<T>,
  ): Promise<{ value: T; at: number; stale: boolean }> {
    const hit = this.entries.get(key);
    if (hit !== undefined && this.now() - hit.at < this.ttlMs) return { ...hit, stale: false };
    try {
      const value = await this.loadOnce(key, load);
      const entry = { value, at: this.now() };
      this.entries.set(key, entry);
      return { ...entry, stale: false };
    } catch (error) {
      if (hit === undefined) throw error;
      return { ...hit, stale: true };
    }
  }

  /** Time the cached value for `key` was produced, if any. */
  ageOf(key: string): number | null {
    const hit = this.entries.get(key);
    return hit === undefined ? null : this.now() - hit.at;
  }

  private loadOnce(key: string, load: () => Promise<T>): Promise<T> {
    const running = this.inFlight.get(key);
    if (running !== undefined) return running;
    const promise = load().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }
}
