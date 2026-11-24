import { describe, expect, it } from 'vitest';
import {
  fetchPmForecast,
  fetchWeather,
  hourIndex,
  searchPlaces,
} from '../../server/sources/openMeteo';
import { airBody, fakeFetch, weatherBody } from './fixtures';

const point = { lat: 19.23, lon: 72.86 };

describe('hourIndex', () => {
  it('maps timestamps to hours since midnight of day one', () => {
    expect(hourIndex(['2026-11-24T00:00', '2026-11-24T17:00'])).toEqual([0, 17]);
  });
  it('continues counting into the second day', () => {
    const times = Array.from({ length: 26 }, (_, i) => {
      const day = i < 24 ? '24' : '25';
      return `2026-11-${day}T${String(i % 24).padStart(2, '0')}:00`;
    });
    expect(hourIndex(times).slice(23)).toEqual([23, 24, 25]);
  });
});

describe('fetchPmForecast', () => {
  it('returns hourly PM2.5 and drops nulls', async () => {
    const { fetchJson, urls } = fakeFetch({ air: () => airBody([2]) });
    const out = await fetchPmForecast(fetchJson, point);
    expect(out).toHaveLength(47);
    expect(out[0]).toEqual({ hour: 0, pm25: 40 });
    expect(out.find((h) => h.hour === 2)).toBeUndefined();
    expect(out.at(-1)).toEqual({ hour: 47, pm25: 63 });
    expect(urls[0]).toContain('latitude=19.23&longitude=72.86');
    expect(urls[0]).toContain('hourly=pm2_5');
  });
  it('falls back to the array index when a time is missing', async () => {
    const { fetchJson } = fakeFetch({
      air: () => ({ hourly: { time: ['2026-11-24T05:00'], pm2_5: [10, 20] } }),
    });
    expect(await fetchPmForecast(fetchJson, point)).toEqual([
      { hour: 5, pm25: 10 },
      { hour: 1, pm25: 20 },
    ]);
  });
  it('rejects a bad body', async () => {
    const { fetchJson } = fakeFetch({ air: () => ({}) });
    await expect(fetchPmForecast(fetchJson, point)).rejects.toThrow();
  });
});

describe('fetchWeather', () => {
  it('returns mixing height and wind, skipping hours with gaps', async () => {
    const { fetchJson, urls } = fakeFetch({ weather: () => weatherBody() });
    const out = await fetchWeather(fetchJson, point);
    expect(out).toHaveLength(46);
    expect(out[0]).toEqual({ hour: 0, mixingHeightM: 300, windKmh: 5 });
    expect(out.find((h) => h.hour === 3)).toBeUndefined();
    expect(out.find((h) => h.hour === 4)).toBeUndefined();
    expect(urls[0]).toContain('boundary_layer_height,wind_speed_10m');
  });
  it('treats missing array entries as gaps', async () => {
    const { fetchJson } = fakeFetch({
      weather: () => ({
        hourly: { time: ['2026-11-24T01:00'], boundary_layer_height: [], wind_speed_10m: [] },
      }),
    });
    expect(await fetchWeather(fetchJson, point)).toEqual([]);
  });
});

describe('searchPlaces', () => {
  it('labels results with district and state', async () => {
    const { fetchJson, urls } = fakeFetch({
      geocode: () => ({
        results: [
          {
            name: 'Chembur',
            latitude: 19.2,
            longitude: 72.85,
            admin1: 'Maharashtra',
            admin2: 'Mumbai',
          },
          { name: 'Goa Velha', latitude: 15.4, longitude: 73.9 },
        ],
      }),
    });
    const out = await searchPlaces(fetchJson, 'kandi vali');
    expect(out).toEqual([
      { label: 'Chembur, Mumbai, Maharashtra', lat: 19.2, lon: 72.85 },
      { label: 'Goa Velha', lat: 15.4, lon: 73.9 },
    ]);
    expect(urls[0]).toContain('name=kandi%20vali&count=5&countryCode=IN');
  });
  it('returns an empty list when nothing matches', async () => {
    const { fetchJson } = fakeFetch({ geocode: () => ({}) });
    expect(await searchPlaces(fetchJson, 'zzzz')).toEqual([]);
  });
});
