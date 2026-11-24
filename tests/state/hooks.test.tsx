// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { airState, useAir, useLedger, useRefreshTick, type Fetched } from '../../src/state/hooks';
import type { Place } from '../../src/state/household';
import { airReport } from '../fixtures/air';
import { json, stubFetch } from '../fixtures/ui';

const A: Place = { label: 'A', lat: 1, lon: 2 };
const B: Place = { label: 'B', lat: 3, lon: 4 };

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('airState', () => {
  const data = airReport();
  it('is idle for no key and loading while a key has no response', () => {
    expect(airState(null, null)).toEqual({ report: null, at: 0, error: null, loading: false });
    expect(airState(null, '1,2')).toEqual({ report: null, at: 0, error: null, loading: true });
  });

  it('ignores a response for another place', () => {
    const f: Fetched = { key: '9,9', data, at: 5 };
    expect(airState(f, '1,2').loading).toBe(true);
  });

  it('exposes a response for the current place', () => {
    expect(airState({ key: '1,2', data, at: 5 }, '1,2')).toEqual({
      report: data,
      at: 5,
      error: null,
      loading: false,
    });
    expect(airState({ key: '1,2', at: 6, error: 'bad' }, '1,2')).toEqual({
      report: null,
      at: 6,
      error: 'bad',
      loading: false,
    });
  });
});

describe('useAir', () => {
  it('does nothing without a place', () => {
    const fake = stubFetch({});
    const { result } = renderHook(() => useAir(null));
    expect(result.current.loading).toBe(false);
    expect(fake).not.toHaveBeenCalled();
  });

  it('loads a report', async () => {
    stubFetch({ 'api/air': () => json(airReport()) });
    const { result } = renderHook(() => useAir(A));
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.report?.pm25).toBe(78);
    expect(result.current.error).toBeNull();
    expect(result.current.at).toBeGreaterThan(0);
  });

  it('reports an error', async () => {
    stubFetch({ 'api/air': () => json({ error: 'Down' }, 500) });
    const { result } = renderHook(() => useAir(A));
    await waitFor(() => {
      expect(result.current.error).toBe('Down');
    });
    expect(result.current.report).toBeNull();
  });

  /** Fetch whose first place (lat=1) answers only when `release` is called. */
  function heldFirst(first: () => Response) {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubFetch({
      'api/air': (_init, url) =>
        url.includes('lat=1') ? held.then(first) : json(airReport({ pm25: 11 })),
    });
    return release;
  }

  it('ignores a stale response after the place changes', async () => {
    const release = heldFirst(() => json(airReport({ pm25: 99 })));
    const { result, rerender } = renderHook(({ p }: { p: Place }) => useAir(p), {
      initialProps: { p: A },
    });
    rerender({ p: B });
    await waitFor(() => {
      expect(result.current.report?.pm25).toBe(11);
    });
    await act(async () => {
      release();
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.report?.pm25).toBe(11);
  });

  it('ignores a stale failure after the place changes', async () => {
    const release = heldFirst(() => json({ error: 'late' }, 500));
    const { result, rerender } = renderHook(({ p }: { p: Place }) => useAir(p), {
      initialProps: { p: A },
    });
    rerender({ p: B });
    await waitFor(() => {
      expect(result.current.report?.pm25).toBe(11);
    });
    await act(async () => {
      release();
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.error).toBeNull();
    expect(result.current.report?.pm25).toBe(11);
  });
});

describe('useLedger', () => {
  const advice = [
    {
      memberId: 'aaji',
      routineId: 'walk',
      verdict: 'go' as const,
      usualHour: 18,
      bestHour: 14,
      part: 'afternoon' as const,
      usualAqi: 1,
      bestAqi: 1,
      usualDose: 10,
      adviceDose: 5,
      savedDose: 5,
    },
  ];
  const at = Date.parse('2026-11-24T06:00:00Z');

  it('returns the stored ledger untouched without a report time', () => {
    const entries = [{ date: '2026-11-20', memberId: 'aaji', saved: 3 }];
    localStorage.setItem('saans-ghar:ledger', JSON.stringify(entries));
    const { result } = renderHook(() => useLedger(advice, null));
    expect(result.current).toEqual(entries);
  });

  it('adds today and saves it', () => {
    const { result } = renderHook(() => useLedger(advice, at));
    expect(result.current).toEqual([{ date: '2026-11-24', memberId: 'aaji', saved: 5 }]);
    expect(JSON.parse(localStorage.getItem('saans-ghar:ledger') ?? '[]')).toEqual(result.current);
  });
});

describe('useRefreshTick', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks every 15 minutes and when the tab comes back, but not while hidden', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useRefreshTick());
    expect(result.current).toBe(0);
    act(() => {
      vi.advanceTimersByTime(900_000);
    });
    expect(result.current).toBe(1);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(2);
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe(2);
    hidden.mockRestore();
    unmount();
  });
});
