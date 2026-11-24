import { describe, expect, it } from 'vitest';
import { AirService, MAX_STATION_KM } from '../../server/air';
import { coarse } from '../../src/engine/geoTypes';
import { istHour } from '../../src/engine/geoTypes';
import { airBody, fakeFetch, page, row, weatherBody, type Routes } from './fixtures';

/** 24-Nov-2026 05:30 UTC = 11:00 IST. */
const NOW = Date.UTC(2026, 10, 24, 5, 30);
const BORIVALI_PT = { lat: 19.2321, lon: 72.8645 };

function service(routes: Routes, key: string | null = 'key'): AirService {
  const { fetchJson } = fakeFetch(routes);
  return new AirService({ fetchJson, dataGovKey: key ?? undefined, now: () => NOW });
}

const stationRows = (): unknown[] => [row(), row({ pollutant_id: 'PM10', avg_value: '120' })];
const full = (): Routes => ({
  cpcb: () => page(stationRows()),
  air: () => airBody(),
  weather: () => weatherBody(),
});

describe('istHour / coarse', () => {
  it('converts UTC to the IST hour, wrapping at midnight', () => {
    expect(istHour(NOW)).toBe(11);
    expect(istHour(Date.UTC(2026, 10, 24, 18, 30))).toBe(0);
    expect(istHour(Date.UTC(2026, 10, 24, 18, 29))).toBe(23);
  });
  it('rounds to about a kilometre', () => {
    expect(coarse({ lat: 19.23214, lon: 72.86456 })).toEqual({ lat: 19.23, lon: 72.86 });
  });
});

describe('allStations', () => {
  it('is empty without a key (undefined or empty)', async () => {
    expect(await service(full(), null).allStations()).toEqual({ list: [], stale: false });
    expect(await service(full(), '').allStations()).toEqual({ list: [], stale: false });
  });
  it('returns stations', async () => {
    const out = await service(full()).allStations();
    expect(out.list).toHaveLength(1);
    expect(out.stale).toBe(false);
  });
  it('is empty and stale when the feed has never loaded', async () => {
    const out = await service({
      cpcb: () => {
        throw new Error('502');
      },
    }).allStations();
    expect(out).toEqual({ list: [], stale: true });
  });
  it('serves the stale list after a later failure', async () => {
    let fail = false;
    const clock = { t: NOW };
    const { fetchJson } = fakeFetch({
      cpcb: () => {
        if (fail) throw new Error('502');
        return page(stationRows());
      },
    });
    const svc = new AirService({ fetchJson, dataGovKey: 'k', now: () => clock.t });
    await svc.allStations();
    fail = true;
    clock.t += 3_600_000;
    const out = await svc.allStations();
    expect(out.list).toHaveLength(1);
    expect(out.stale).toBe(true);
  });
});

describe('report', () => {
  it('uses the nearby CPCB station and calibrates the forecast', async () => {
    const r = await service(full()).report({ lat: 19.23214, lon: 72.86456 });
    expect(r.source).toBe('cpcb');
    expect(r.station?.name).toBe('Borivali East, Mumbai - MPCB');
    expect(r.station?.km).toBeLessThan(MAX_STATION_KM);
    expect(r.aqi).not.toBeNull();
    expect(r.pm25).not.toBeNull();
    expect(r.forecast.length).toBeGreaterThan(0);
    expect(r.weather.length).toBeGreaterThan(0);
    expect(r.stale).toBe(false);
  });

  it('keeps the raw model forecast when the station has no PM2.5', async () => {
    const r = await service({
      ...full(),
      cpcb: () => page([row({ pollutant_id: 'PM10', avg_value: '120' })]),
    }).report(BORIVALI_PT);
    expect(r.source).toBe('cpcb');
    expect(r.pm25).toBeNull();
    expect(r.forecast).toHaveLength(48);
    expect(r.forecast[0]).toEqual({ hour: 0, pm25: 40 });
  });

  it('falls back to the model when the station is too far', async () => {
    const r = await service(full()).report({ lat: 19.2321 + 0.5, lon: 72.8645 });
    expect(r.source).toBe('model');
    expect(r.station).toBeNull();
    expect(r.pm25).toBe(51);
    expect(r.aqi).not.toBeNull();
    expect(r.forecast).toHaveLength(48);
  });

  it('falls back to the model without a key', async () => {
    const r = await service(full(), null).report(BORIVALI_PT);
    expect(r.source).toBe('model');
    expect(r.stale).toBe(false);
  });

  it('has no AQI when the model lacks the current hour', async () => {
    const r = await service({ ...full(), air: () => airBody([11]) }, null).report(BORIVALI_PT);
    expect(r.pm25).toBeNull();
    expect(r.aqi).toBeNull();
  });

  it('returns empty forecast arrays when the forecast fails', async () => {
    const r = await service({
      cpcb: () => page(stationRows()),
      air: () => {
        throw new Error('down');
      },
      weather: () => weatherBody(),
    }).report(BORIVALI_PT);
    expect(r.source).toBe('cpcb');
    expect(r.weather).toEqual([]);
    expect(r.forecast).toEqual([]);
  });

  it('reuses the cached forecast for the same rounded point', async () => {
    const { fetchJson, urls } = fakeFetch(full());
    const svc = new AirService({ fetchJson, dataGovKey: 'k', now: () => NOW });
    await svc.report(BORIVALI_PT);
    await svc.report({ lat: 19.2322, lon: 72.8646 });
    expect(urls.filter((u) => u.includes('air-quality-api'))).toHaveLength(1);
  });
});
