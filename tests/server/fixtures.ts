import type { FetchJson } from '../../server/sources/cpcb';

export interface Row {
  state: string;
  city: string;
  station: string;
  last_update: string;
  latitude: string;
  longitude: string;
  pollutant_id: string;
  avg_value: string;
}

export const BORIVALI = 'Borivali East, Mumbai - MPCB';

export function row(over: Partial<Row> = {}): Row {
  return {
    state: 'Maharashtra',
    city: 'Mumbai',
    station: BORIVALI,
    last_update: '23-11-2026 23:00:00',
    latitude: '19.2321',
    longitude: '72.8645',
    pollutant_id: 'PM2.5',
    avg_value: '83',
    ...over,
  };
}

export function page(records: readonly unknown[], total: number = records.length): unknown {
  return { total: String(total), count: records.length, records };
}

/** 48 hourly timestamps for today and tomorrow. */
function times(): string[] {
  const out: string[] = [];
  for (let i = 0; i < 48; i++) {
    const day = i < 24 ? '2026-11-24' : '2026-11-25';
    out.push(`${day}T${String(i % 24).padStart(2, '0')}:00`);
  }
  return out;
}

export function airBody(nullAt: readonly number[] = []): unknown {
  return {
    hourly: {
      time: times(),
      pm2_5: times().map((_, i) => (nullAt.includes(i) ? null : 40 + (i % 24))),
    },
  };
}

export function weatherBody(): unknown {
  return {
    hourly: {
      time: times(),
      boundary_layer_height: times().map((_, i) => (i === 3 ? null : 300 + i)),
      wind_speed_10m: times().map((_, i) => (i === 4 ? null : 5 + (i % 3))),
    },
  };
}

export interface Routes {
  cpcb?: () => unknown;
  air?: () => unknown;
  weather?: () => unknown;
  geocode?: () => unknown;
}

/** Fake upstreams routed by URL; records every URL requested. */
export function fakeFetch(routes: Routes): { fetchJson: FetchJson; urls: string[] } {
  const urls: string[] = [];
  const fetchJson: FetchJson = (url) => {
    urls.push(url);
    const pick = (): (() => unknown) | undefined => {
      if (url.includes('data.gov.in')) return routes.cpcb;
      if (url.includes('geocoding-api')) return routes.geocode;
      if (url.includes('air-quality-api')) return routes.air;
      if (url.includes('api.open-meteo.com')) return routes.weather;
      return undefined;
    };
    const handler = pick();
    if (handler === undefined) return Promise.reject(new Error('no route'));
    try {
      return Promise.resolve(handler());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('failed'));
    }
  };
  return { fetchJson, urls };
}
