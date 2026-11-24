import { describe, expect, it, vi } from 'vitest';
import { AirService } from '../../server/air';
import type { AiModel } from '../../server/ai/model';
import { createApp } from '../../server/app';
import { airBody, fakeFetch, page, row, weatherBody, type Routes } from './fixtures';

const NOW = Date.UTC(2026, 10, 24, 5, 30);
const fakeAi: AiModel = {
  generate: () => Promise.resolve({ text: '', calls: [], content: undefined }),
};

const routes = (): Routes => ({
  cpcb: () => page([row()]),
  air: () => airBody(),
  weather: () => weatherBody(),
  geocode: () => ({
    results: [{ name: 'Chembur', latitude: 19.2, longitude: 72.85, admin1: 'Maharashtra' }],
  }),
});

function build(aiEnabled = false): ReturnType<typeof createApp> {
  const { fetchJson } = fakeFetch(routes());
  const air = new AirService({ fetchJson, dataGovKey: 'k', now: () => NOW });
  return createApp({ air, fetchJson, ai: aiEnabled ? fakeAi : null });
}

interface Health {
  ok: boolean;
  stations: number;
  stale: boolean;
  ai: boolean;
}
interface Places {
  stations: { label: string }[];
  places: { label: string }[];
}
interface Report {
  source: string;
  station: { name: string } | null;
}

describe('createApp', () => {
  it('reports health with security headers', async () => {
    const res = await build(true).request('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect((await res.json()) as Health).toEqual({ ok: true, stations: 1, stale: false, ai: true });
  });

  it('searches places: 400 for a short query, results otherwise', async () => {
    const app = build();
    expect((await app.request('/api/places?q=a')).status).toBe(400);
    expect((await app.request('/api/places')).status).toBe(400);
    const ok = await app.request('/api/places?q=borivali');
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as Places;
    expect(body.stations[0]?.label).toBe('Borivali East, Mumbai - MPCB');
    expect(body.places[0]?.label).toBe('Chembur, Maharashtra');
  });

  it('serves an air report, rejecting bad or non-Indian coordinates', async () => {
    const app = build();
    expect((await app.request('/api/air')).status).toBe(400);
    expect((await app.request('/api/air?lat=abc&lon=72')).status).toBe(400);
    expect((await app.request('/api/air?lat=95&lon=72')).status).toBe(400);
    expect((await app.request('/api/air?lat=51.5&lon=-0.12')).status).toBe(400);
    const ok = await app.request('/api/air?lat=19.2321&lon=72.8645');
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as Report;
    expect(body.source).toBe('cpcb');
    expect(body.station?.name).toBe('Borivali East, Mumbai - MPCB');
  });

  it('returns a generic 500 when a handler throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const air = {
      allStations: () => Promise.resolve({ list: [], stale: false }),
      report: () => Promise.reject(new Error('kaboom')),
    } as unknown as AirService;
    const app = createApp({ air, fetchJson: () => Promise.resolve({}), ai: null });
    const res = await app.request('/api/air?lat=19&lon=73');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Something went wrong. Please try again.' });
    expect(err).toHaveBeenCalledWith(expect.stringContaining('kaboom'));
  });

  it('rate limits per client with Retry-After', async () => {
    const app = build();
    const headers = { 'x-forwarded-for': '9.9.9.9' };
    for (let i = 0; i < 60; i++) {
      expect((await app.request('/api/health', { headers })).status).toBe(200);
    }
    const blocked = await app.request('/api/health', { headers });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    const other = await app.request('/api/health', { headers: { 'x-forwarded-for': '8.8.8.8' } });
    expect(other.status).toBe(200);
  });

  it('blocks cross-site writes and lets same-origin ones through', async () => {
    const app = build();
    const post = (headers: Record<string, string>): Promise<Response> =>
      Promise.resolve(app.request('/api/health', { method: 'POST', headers }));
    expect((await post({})).status).toBe(403);
    expect((await post({ origin: 'https://evil.test', host: 'app.test' })).status).toBe(403);
    expect((await post({ origin: 'https://app.test', host: 'app.test' })).status).toBe(404);
  });

  it('rejects bodies over 8 KB', async () => {
    const res = await build().request('/api/health', {
      method: 'POST',
      headers: { origin: 'https://app.test', host: 'app.test', 'content-type': 'text/plain' },
      body: 'x'.repeat(9000),
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'Request too large.' });
  });
});
