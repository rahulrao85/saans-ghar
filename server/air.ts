import { computeAqi, type AqiResult } from '../src/engine/aqi';
import { calibrate, type HourlyPm } from '../src/engine/forecast';
import { StaleCache } from './cache';
import { nearest, type LatLon } from './geo';
import { fetchStations, type FetchJson, type Station } from './sources/cpcb';
import { fetchPmForecast, fetchWeather, type WeatherHour } from './sources/openMeteo';

/** A station further than this is not "your" air. */
export const MAX_STATION_KM = 25;
/** 30 minutes. */
const STATIONS_TTL_MS = 1_800_000;
/** 1 hour. */
const FORECAST_TTL_MS = 3_600_000;
/** UTC+05:30. */
const IST_OFFSET_MS = 19_800_000;
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
/** Round coordinates to ~1 km before caching or sending anywhere (privacy + cache hits). */
const COORD_DECIMALS = 100;

/** Everything the app needs about the air at one place. */
export interface AirReport {
  readonly source: 'cpcb' | 'model';
  readonly station: (Pick<Station, 'name' | 'city' | 'state' | 'updated'> & { km: number }) | null;
  readonly aqi: AqiResult | null;
  /** Measured (CPCB) or modelled PM2.5 now, µg/m³. */
  readonly pm25: number | null;
  /** Hourly PM2.5, scaled to the station when there is one. */
  readonly forecast: readonly HourlyPm[];
  readonly weather: readonly WeatherHour[];
  /** True when the station data is older than the refresh interval (upstream down). */
  readonly stale: boolean;
}

/** Dependencies, injectable for tests. */
export interface AirDeps {
  readonly fetchJson: FetchJson;
  readonly dataGovKey: string | undefined;
  readonly now: () => number;
}

/** Current hour in India, as hours since local midnight. */
export function istHour(nowMs: number): number {
  return Math.floor((nowMs + IST_OFFSET_MS) / MS_PER_HOUR) % HOURS_PER_DAY;
}

/** Round a point to about 1 km. */
export function coarse(p: LatLon): LatLon {
  return {
    lat: Math.round(p.lat * COORD_DECIMALS) / COORD_DECIMALS,
    lon: Math.round(p.lon * COORD_DECIMALS) / COORD_DECIMALS,
  };
}

/** Builds air reports from CPCB stations plus the Open-Meteo forecast. */
export class AirService {
  private readonly stations: StaleCache<Station[]>;
  private readonly forecasts: StaleCache<[HourlyPm[], WeatherHour[]]>;

  constructor(private readonly deps: AirDeps) {
    this.stations = new StaleCache(STATIONS_TTL_MS, deps.now);
    this.forecasts = new StaleCache(FORECAST_TTL_MS, deps.now);
  }

  /** All CPCB stations (empty when there is no key or the feed has never loaded). */
  async allStations(): Promise<{ list: Station[]; stale: boolean }> {
    const key = this.deps.dataGovKey;
    if (key === undefined || key === '') return { list: [], stale: false };
    try {
      const hit = await this.stations.get('all', () => fetchStations(this.deps.fetchJson, key));
      return { list: hit.value, stale: hit.stale };
    } catch {
      return { list: [], stale: true };
    }
  }

  /** The air report for a point. */
  async report(point: LatLon): Promise<AirReport> {
    const p = coarse(point);
    const [{ list, stale }, [model, weather]] = await Promise.all([
      this.allStations(),
      this.forecastFor(p),
    ]);
    const hit = nearest(list, p, MAX_STATION_KM);
    const hour = istHour(this.deps.now());
    if (hit === null) return modelReport(model, weather, hour, stale);
    const aqi = computeAqi(hit.item.readings);
    const pm25 = hit.item.readings.find((r) => r.pollutant === 'PM2.5')?.value ?? null;
    const forecast = pm25 === null ? model : calibrate(model, pm25, hour).hours;
    const { name, city, state, updated } = hit.item;
    return {
      source: 'cpcb',
      station: { name, city, state, updated, km: hit.km },
      aqi,
      pm25,
      forecast,
      weather,
      stale,
    };
  }

  private async forecastFor(p: LatLon): Promise<[HourlyPm[], WeatherHour[]]> {
    const load = (): Promise<[HourlyPm[], WeatherHour[]]> =>
      Promise.all([fetchPmForecast(this.deps.fetchJson, p), fetchWeather(this.deps.fetchJson, p)]);
    try {
      return (await this.forecasts.get(`${p.lat},${p.lon}`, load)).value;
    } catch {
      return [[], []];
    }
  }
}

function modelReport(
  model: HourlyPm[],
  weather: WeatherHour[],
  hour: number,
  stale: boolean,
): AirReport {
  const pm25 = model.find((h) => h.hour === hour)?.pm25 ?? null;
  const aqi = pm25 === null ? null : computeAqi([{ pollutant: 'PM2.5', value: pm25 }]);
  return { source: 'model', station: null, aqi, pm25, forecast: model, weather, stale };
}
