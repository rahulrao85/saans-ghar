import type { LatLon } from './geo';
import type { FetchJson, Station } from './sources/cpcb';
import { searchPlaces, type Place } from './sources/openMeteo';

/** A CPCB station that matched the search, so users can pick their exact monitor. */
export interface StationMatch extends LatLon {
  readonly label: string;
  readonly city: string;
}

const MAX_STATION_MATCHES = 8;

/** Stations whose name or city contains the query (case-insensitive). */
export function matchStations(query: string, stations: readonly Station[]): StationMatch[] {
  const q = query.toLowerCase();
  return stations
    .filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
    .slice(0, MAX_STATION_MATCHES)
    .map((s) => ({ label: s.name, city: s.city, lat: s.lat, lon: s.lon }));
}

/**
 * Stations first (they name Indian localities precisely, e.g. "Chembur"),
 * then general place search. A failed place search still returns the stations.
 */
export async function findPlaces(
  query: string,
  stations: readonly Station[],
  fetchJson: FetchJson,
): Promise<{ stations: StationMatch[]; places: Place[] }> {
  const matched = matchStations(query, stations);
  const places = await searchPlaces(fetchJson, query).catch((): Place[] => []);
  return { stations: matched, places };
}
