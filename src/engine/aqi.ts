import { AQI_BANDS, BREAKPOINTS, POLLUTANTS, type AqiBand, type Pollutant } from './data/naqi';
import { at } from './util';

/** Highest value the NAQI scale reports. */
const AQI_MAX = 500;
const TENTHS = 10;
/** CPCB needs at least this many pollutants for an overall index. */
const MIN_POLLUTANTS = 3;
/** One of these must be present for an overall index. */
const PARTICULATES: readonly Pollutant[] = ['PM2.5', 'PM10'];

/** One pollutant concentration from a station. */
export interface Reading {
  readonly pollutant: Pollutant;
  /** µg/m³ (mg/m³ for CO). */
  readonly value: number;
}

/** The overall index and how it was reached. */
export interface AqiResult {
  readonly aqi: number;
  readonly band: AqiBand;
  /** Pollutant with the highest sub-index. */
  readonly dominant: Pollutant;
  readonly subIndices: Readonly<Partial<Record<Pollutant, number>>>;
  /** False when CPCB's minimum-data rule was not met (index is indicative). */
  readonly complete: boolean;
}

/**
 * Linear CPCB sub-index for one pollutant concentration.
 * @returns integer index in 0–500, or null for a negative or non-finite value.
 */
export function subIndex(pollutant: Pollutant, value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const ranges = BREAKPOINTS[pollutant];
  let i = 0;
  while (i < ranges.length - 1 && value >= at(ranges, i + 1)[0]) i++;
  const [low, high] = at(ranges, i);
  const band = at(AQI_BANDS, i);
  const clamped = Math.min(Math.max(value, low), high);
  const scaled = ((band.high - band.low) / (high - low)) * (clamped - low) + band.low;
  return Math.min(AQI_MAX, Math.round(scaled));
}

/**
 * Concentration that gives a sub-index: the inverse of `subIndex`.
 * Feeds that publish sub-indices (CPCB's live feed) are turned back into
 * µg/m³ so the dose maths can use them.
 * @returns concentration rounded to one decimal, or null for an invalid index.
 */
export function concentrationFor(pollutant: Pollutant, index: number): number | null {
  if (!Number.isFinite(index) || index < 0) return null;
  const capped = Math.min(index, AQI_MAX);
  const i = Math.max(
    0,
    AQI_BANDS.findIndex((b) => capped <= b.high),
  );
  const band = at(AQI_BANDS, i);
  const [low, high] = at(BREAKPOINTS[pollutant], i);
  const share = (Math.max(capped, band.low) - band.low) / (band.high - band.low);
  return Math.round((low + share * (high - low)) * TENTHS) / TENTHS;
}

/** PM2.5 sub-index, or 0 when the value is unusable. */
export function pm25Index(value: number): number {
  return subIndex('PM2.5', value) ?? 0;
}

/** The NAQI band for an index value (values above 500 map to Severe). */
export function bandFor(aqi: number): AqiBand {
  return AQI_BANDS.find((b) => aqi <= b.high) ?? at(AQI_BANDS, AQI_BANDS.length - 1);
}

/**
 * Overall NAQI: the highest sub-index across the readings.
 * @returns null when no reading gives a valid sub-index.
 */
export function computeAqi(readings: readonly Reading[]): AqiResult | null {
  const subIndices: Partial<Record<Pollutant, number>> = {};
  let best: { pollutant: Pollutant; index: number } | null = null;
  for (const r of readings) {
    const index = subIndex(r.pollutant, r.value);
    if (index === null) continue;
    subIndices[r.pollutant] = Math.max(index, subIndices[r.pollutant] ?? 0);
    if (best === null || index > best.index) best = { pollutant: r.pollutant, index };
  }
  if (best === null) return null;
  const present = POLLUTANTS.filter((p) => subIndices[p] !== undefined);
  const complete =
    present.length >= MIN_POLLUTANTS && present.some((p) => PARTICULATES.includes(p));
  return {
    aqi: best.index,
    band: bandFor(best.index),
    dominant: best.pollutant,
    subIndices,
    complete,
  };
}
