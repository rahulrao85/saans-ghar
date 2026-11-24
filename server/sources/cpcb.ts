import { z } from 'zod';
import { concentrationFor, type Reading } from '../../src/engine/aqi';
import { POLLUTANTS } from '../../src/engine/data/naqi';

/** data.gov.in resource: "Real time Air Quality Index from various locations" (CPCB). */
const RESOURCE_URL = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';
const PAGE_SIZE = 1000;
/** About 4,000 rows nationally; stop well past that in case the feed grows. */
const MAX_PAGES = 8;

/** One CPCB monitoring station with its latest readings. */
export interface Station {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly lat: number;
  readonly lon: number;
  /** ISO 8601 with the +05:30 offset. */
  readonly updated: string;
  readonly readings: readonly Reading[];
}

/** Fetch function shape, injectable for tests. */
export type FetchJson = (url: string) => Promise<unknown>;

const recordSchema = z.object({
  state: z.string(),
  city: z.string(),
  station: z.string(),
  last_update: z.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  pollutant_id: z.string(),
  avg_value: z.string(),
});
const pageSchema = z.object({ total: z.coerce.number(), records: z.array(z.unknown()) });

type CpcbRecord = z.infer<typeof recordSchema>;

/** "23-11-2026 17:00:00" (IST) → "2026-11-23T17:00:00+05:30"; null if malformed. */
export function toIsoIst(value: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (m === null) return null;
  const [, d, mo, y, h, mi, s] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+05:30`;
}

/**
 * Turn one row into a reading. The feed publishes each pollutant's sub-index,
 * so it is converted back to a concentration for the dose maths.
 */
export function toReading(row: CpcbRecord): Reading | null {
  const pollutant = POLLUTANTS.find((p) => p === row.pollutant_id);
  const index = Number(row.avg_value);
  if (pollutant === undefined || row.avg_value.trim() === '' || !Number.isFinite(index))
    return null;
  const value = concentrationFor(pollutant, index);
  return value === null ? null : { pollutant, value };
}

/** Group rows (one per pollutant) into stations; rows that fail validation are skipped. */
export function groupStations(rows: readonly unknown[]): Station[] {
  const byName = new Map<string, { base: Omit<Station, 'readings'>; readings: Reading[] }>();
  for (const raw of rows) {
    const parsed = recordSchema.safeParse(raw);
    if (!parsed.success) continue;
    const row = parsed.data;
    const updated = toIsoIst(row.last_update);
    const reading = toReading(row);
    if (updated === null || reading === null) continue;
    const entry = byName.get(row.station) ?? { base: stationBase(row, updated), readings: [] };
    entry.readings.push(reading);
    byName.set(row.station, entry);
  }
  return [...byName.values()].map(({ base, readings }) => ({ ...base, readings }));
}

function stationBase(row: CpcbRecord, updated: string): Omit<Station, 'readings'> {
  return {
    id: row.station.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: row.station,
    city: row.city,
    state: row.state,
    lat: row.latitude,
    lon: row.longitude,
    updated,
  };
}

/** Download every page of the national feed and group it into stations. */
export async function fetchStations(fetchJson: FetchJson, apiKey: string): Promise<Station[]> {
  const rows: unknown[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${RESOURCE_URL}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`;
    const body = pageSchema.parse(await fetchJson(url));
    rows.push(...body.records);
    if (rows.length >= body.total || body.records.length < PAGE_SIZE) break;
  }
  return groupStations(rows);
}
