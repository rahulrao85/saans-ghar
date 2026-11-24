/** A point on Earth in decimal degrees. */
export interface LatLon {
  readonly lat: number;
  readonly lon: number;
}

/** Round coordinates to ~1 km before storing, caching or sending them anywhere. */
const COORD_SCALE = 100;

/** Round a point to about 1 km: enough for the nearest station, too coarse to find a home. */
export function coarse(p: LatLon): LatLon {
  return {
    lat: Math.round(p.lat * COORD_SCALE) / COORD_SCALE,
    lon: Math.round(p.lon * COORD_SCALE) / COORD_SCALE,
  };
}

/** UTC+05:30. */
const IST_OFFSET_MS = 19_800_000;
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;

/** Current hour in India, as hours since local midnight. */
export function istHour(nowMs: number): number {
  return Math.floor((nowMs + IST_OFFSET_MS) / MS_PER_HOUR) % HOURS_PER_DAY;
}

/** Cities whose AQI response follows Delhi-NCR's GRAP stages. */
const NCR = ['delhi', 'gurugram', 'gurgaon', 'noida', 'greater noida', 'ghaziabad', 'faridabad'];

/** True for a station in Delhi-NCR, where GRAP stages apply. */
export function inDelhiNcr(city: string, state: string): boolean {
  const c = city.toLowerCase();
  return state.toLowerCase() === 'delhi' || NCR.some((n) => c.includes(n));
}
