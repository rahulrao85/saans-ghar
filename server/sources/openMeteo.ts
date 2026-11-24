import { z } from 'zod';
import type { HourlyPm } from '../../src/engine/forecast';
import type { WeatherHourData } from '../../src/engine/weatherTypes';
import type { LatLon } from '../geo';
import type { FetchJson } from './cpcb';

const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_DAYS = 2;
const HOURS_PER_DAY = 24;
const GEOCODE_RESULTS = 5;
/** Hour in "2026-11-23T17:00" → position 11–13. */
const HOUR_START = 11;
const HOUR_END = 13;

const hourlySeries = z.object({ time: z.array(z.string()) });
const airSchema = z.object({
  hourly: hourlySeries.extend({ pm2_5: z.array(z.number().nullable()) }),
});
const weatherSchema = z.object({
  hourly: hourlySeries.extend({
    boundary_layer_height: z.array(z.number().nullable()),
    wind_speed_10m: z.array(z.number().nullable()),
  }),
});
const geocodeSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        admin2: z.string().optional(),
      }),
    )
    .optional(),
});

/** Weather that explains smog (shared with the client). */
export type WeatherHour = WeatherHourData;

/** A place search match. */
export interface Place extends LatLon {
  readonly label: string;
}

/** Hours since local midnight of the first day for each timestamp. */
export function hourIndex(times: readonly string[]): number[] {
  return times.map((t, i) => {
    const day = Math.floor(i / HOURS_PER_DAY);
    return day * HOURS_PER_DAY + Number(t.slice(HOUR_START, HOUR_END));
  });
}

function pointQuery(p: LatLon): string {
  return `latitude=${p.lat}&longitude=${p.lon}&forecast_days=${FORECAST_DAYS}&timezone=Asia%2FKolkata`;
}

/** Modelled hourly PM2.5 for today and tomorrow (CAMS global model via Open-Meteo). */
export async function fetchPmForecast(fetchJson: FetchJson, p: LatLon): Promise<HourlyPm[]> {
  const body = airSchema.parse(await fetchJson(`${AIR_URL}?${pointQuery(p)}&hourly=pm2_5`));
  const hours = hourIndex(body.hourly.time);
  return body.hourly.pm2_5.flatMap((pm25, i) =>
    pm25 === null ? [] : [{ hour: hours[i] ?? i, pm25 }],
  );
}

/** Hourly mixing height and wind for the inversion explanation. */
export async function fetchWeather(fetchJson: FetchJson, p: LatLon): Promise<WeatherHour[]> {
  const fields = 'hourly=boundary_layer_height,wind_speed_10m';
  const body = weatherSchema.parse(await fetchJson(`${WEATHER_URL}?${pointQuery(p)}&${fields}`));
  const hours = hourIndex(body.hourly.time);
  return hours.flatMap((hour, i) => {
    const mixing = body.hourly.boundary_layer_height[i];
    const wind = body.hourly.wind_speed_10m[i];
    if (mixing == null || wind == null) return [];
    return [{ hour, mixingHeightM: mixing, windKmh: wind }];
  });
}

/** Place search limited to India; labels include district and state so users can check them. */
export async function searchPlaces(fetchJson: FetchJson, query: string): Promise<Place[]> {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(query)}&count=${GEOCODE_RESULTS}&countryCode=IN`;
  const body = geocodeSchema.parse(await fetchJson(url));
  return (body.results ?? []).map((r) => ({
    label: [r.name, r.admin2, r.admin1].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}
