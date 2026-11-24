import type { Activity } from './breathing';
import type { TravelMode } from '../household';

/** What a trip mode means for breathing and for the air. */
export interface ModeFacts {
  readonly label: string;
  /** Typical door-to-door city speed, km/h. */
  readonly speedKmh: number;
  readonly activity: Activity;
  /**
   * In-transit PM2.5 as a share of the outdoor reading. Illustrative mid-range
   * values: Delhi on-road studies report wide ranges by route and season.
   */
  readonly exposureShare: number;
  /** Tailpipe CO2 per passenger-km, grams (approx.; India GHG Program, road transport). */
  readonly co2PerPkm: number;
}

/** Every mode, in the order the app lists them. */
export const MODE_IDS: readonly TravelMode[] = [
  'walk',
  'cycle',
  'two-wheeler',
  'auto',
  'bus',
  'metro',
  'car',
];

/** Facts per mode. Walking and cycling emit nothing but breathe harder. */
export const MODES: Readonly<Record<TravelMode, ModeFacts>> = {
  walk: { label: 'Walk', speedKmh: 4.5, activity: 'moderate', exposureShare: 1.1, co2PerPkm: 0 },
  cycle: { label: 'Cycle', speedKmh: 12, activity: 'moderate', exposureShare: 1.2, co2PerPkm: 0 },
  'two-wheeler': {
    label: 'Two-wheeler',
    speedKmh: 22,
    activity: 'light',
    exposureShare: 1.4,
    co2PerPkm: 34,
  },
  auto: {
    label: 'Auto-rickshaw',
    speedKmh: 18,
    activity: 'rest',
    exposureShare: 1.4,
    co2PerPkm: 45,
  },
  bus: { label: 'Bus', speedKmh: 15, activity: 'rest', exposureShare: 1.2, co2PerPkm: 15 },
  metro: { label: 'Metro', speedKmh: 30, activity: 'rest', exposureShare: 0.6, co2PerPkm: 20 },
  car: {
    label: 'Car (AC, recirculate)',
    speedKmh: 20,
    activity: 'rest',
    exposureShare: 0.7,
    co2PerPkm: 139,
  },
};
