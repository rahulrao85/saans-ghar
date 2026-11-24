import type { LatLon } from '../src/engine/geoTypes';

export type { LatLon };

const EARTH_RADIUS_KM = 6371;
const DEGREES_PER_HALF_TURN = 180;
const DEG_TO_RAD = Math.PI / DEGREES_PER_HALF_TURN;
const TENTHS = 10;
/** India's rough bounding box, degrees. */
const INDIA = { south: 6, north: 37.5, west: 68, east: 97.5 } as const;

/** Great-circle distance in km (haversine), rounded to 0.1 km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLon = (b.lon - a.lon) * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLon / 2) ** 2;
  const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  return Math.round(km * TENTHS) / TENTHS;
}

/**
 * The closest item to a point, if it is within `maxKm`.
 * @returns the item and its distance, or null when none is close enough.
 */
export function nearest<T extends LatLon>(
  items: readonly T[],
  point: LatLon,
  maxKm: number,
): { item: T; km: number } | null {
  let best: { item: T; km: number } | null = null;
  for (const item of items) {
    const km = distanceKm(point, item);
    if (km <= maxKm && (best === null || km < best.km)) best = { item, km };
  }
  return best;
}

/** True when the coordinates are inside India's bounding box (roughly). */
export function inIndia(p: LatLon): boolean {
  return p.lat >= INDIA.south && p.lat <= INDIA.north && p.lon >= INDIA.west && p.lon <= INDIA.east;
}
