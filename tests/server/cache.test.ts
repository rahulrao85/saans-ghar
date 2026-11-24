import { describe, expect, it, vi } from 'vitest';
import { StaleCache } from '../../server/cache';

function setup(): { cache: StaleCache<string>; clock: { t: number } } {
  const clock = { t: 1000 };
  return { cache: new StaleCache<string>(100, () => clock.t), clock };
}

describe('StaleCache', () => {
  it('loads once, then serves from cache while fresh', async () => {
    const { cache, clock } = setup();
    const load = vi.fn(() => Promise.resolve('a'));
    expect(await cache.get('k', load)).toEqual({ value: 'a', at: 1000, stale: false });
    clock.t = 1099;
    expect(await cache.get('k', load)).toEqual({ value: 'a', at: 1000, stale: false });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after the ttl', async () => {
    const { cache, clock } = setup();
    await cache.get('k', () => Promise.resolve('a'));
    clock.t = 1100;
    expect((await cache.get('k', () => Promise.resolve('b'))).value).toBe('b');
  });

  it('serves the stale value when a refresh fails', async () => {
    const { cache, clock } = setup();
    await cache.get('k', () => Promise.resolve('a'));
    clock.t = 5000;
    const out = await cache.get('k', () => Promise.reject(new Error('502')));
    expect(out).toEqual({ value: 'a', at: 1000, stale: true });
  });

  it('throws when the first load fails', async () => {
    const { cache } = setup();
    await expect(cache.get('k', () => Promise.reject(new Error('502')))).rejects.toThrow('502');
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const { cache } = setup();
    let resolve: (v: string) => void = () => undefined;
    const load = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    const first = cache.get('k', load);
    const second = cache.get('k', load);
    resolve('x');
    expect((await first).value).toBe('x');
    expect((await second).value).toBe('x');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports the age of an entry, or null', async () => {
    const { cache, clock } = setup();
    expect(cache.ageOf('k')).toBeNull();
    await cache.get('k', () => Promise.resolve('a'));
    clock.t = 1040;
    expect(cache.ageOf('k')).toBe(40);
  });

  it('defaults to Date.now', async () => {
    const cache = new StaleCache<number>(60_000);
    const out = await cache.get('k', () => Promise.resolve(1));
    expect(Math.abs(out.at - Date.now())).toBeLessThan(5000);
  });
});
