import { afterEach, describe, expect, it, vi } from 'vitest';
import { ask, explain, findPlaces, getAir, messageOf, notice, readPhoto } from '../../src/api';
import { airReport } from '../fixtures/air';
import { json, parseBody, planFacts, stubFetch } from '../fixtures/ui';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('getAir GETs a relative path and validates the report', async () => {
    const fake = stubFetch({ 'api/air': () => json(airReport()) });
    const report = await getAir({ lat: 19.2, lon: 72.8 });
    expect(report.pm25).toBe(78);
    expect(fake).toHaveBeenCalledWith('api/air?lat=19.2&lon=72.8', {});
  });

  it('findPlaces encodes the query', async () => {
    const fake = stubFetch({ 'api/places': () => json({ stations: [], places: [] }) });
    await expect(findPlaces('a b&c')).resolves.toEqual({ stations: [], places: [] });
    expect(fake).toHaveBeenCalledWith('api/places?q=a%20b%26c', {});
  });

  it('POSTs JSON for the AI routes', async () => {
    const reply = { text: 'hello', source: 'gemini' };
    const fake = stubFetch({ 'api/ai/': () => json(reply) });
    const facts = planFacts();
    await expect(explain(facts, 'hi')).resolves.toEqual(reply);
    await expect(ask(facts, 'why?', 'en')).resolves.toEqual(reply);
    await expect(
      notice({ place: 'X', aqi: 10, delhiNcr: false, cleanestHour: null, language: 'mr' }),
    ).resolves.toEqual(reply);
    const init = fake.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'content-type': 'application/json' });
    expect(parseBody(init)).toEqual({ facts, language: 'hi' });
  });

  it('readPhoto returns the display reading', async () => {
    stubFetch({ 'api/ai/read': () => json({ found: true, pm25: 41, device: 'monitor' }) });
    await expect(readPhoto('abc', 'image/jpeg')).resolves.toEqual({
      found: true,
      pm25: 41,
      device: 'monitor',
    });
  });

  it('throws the server error message on a non-ok response', async () => {
    stubFetch({ 'api/air': () => json({ error: 'Too many requests' }, 429) });
    await expect(getAir({ lat: 1, lon: 2 })).rejects.toThrow('Too many requests');
  });

  it('throws a default message when the failure is not JSON', async () => {
    stubFetch({ 'api/air': () => new Response('<html>bad gateway</html>', { status: 502 }) });
    await expect(getAir({ lat: 1, lon: 2 })).rejects.toThrow(
      'The server is not answering. Try again.',
    );
  });

  it('throws on a schema mismatch', async () => {
    stubFetch({ 'api/air': () => json({ source: 'cpcb' }) });
    await expect(getAir({ lat: 1, lon: 2 })).rejects.toThrow();
  });
});

describe('messageOf', () => {
  it('uses an Error message and a default for anything else', () => {
    expect(messageOf(new Error('boom'))).toBe('boom');
    expect(messageOf('nope')).toBe('Something went wrong. Try again.');
  });
});
