import type { AgeGroup } from './data/breathing';
import { MINUTES_PER_HOUR } from './data/day';
import { MODES } from './data/travel';
import { inhaledDose } from './dose';
import type { TravelMode } from './household';

/** One way to make a trip, with both sides of its impact. */
export interface TripOption {
  readonly mode: TravelMode;
  readonly minutes: number;
  /** µg of PM2.5 the traveller breathes in. */
  readonly dose: number;
  /** Grams of tailpipe CO2 for this traveller's share. */
  readonly co2: number;
}

/** A switch from the usual mode, with what it changes. */
export interface Switch extends TripOption {
  readonly doseChange: number;
  readonly co2Change: number;
}

/** Breathed dose and emissions for one trip by one mode. */
export function tripOption(
  mode: TravelMode,
  km: number,
  pm25: number,
  group: AgeGroup,
): TripOption {
  const facts = MODES[mode];
  const minutes = Math.round((Math.max(0, km) / facts.speedKmh) * MINUTES_PER_HOUR);
  return {
    mode,
    minutes,
    dose: inhaledDose(pm25 * facts.exposureShare, group, facts.activity, minutes),
    co2: Math.round(facts.co2PerPkm * Math.max(0, km)),
  };
}

/**
 * Every other mode compared with the usual one, best first: lower emissions,
 * then lower dose. Negative changes are savings.
 */
export function compareSwitches(
  usual: TravelMode,
  km: number,
  pm25: number,
  group: AgeGroup,
): Switch[] {
  const base = tripOption(usual, km, pm25, group);
  return (Object.keys(MODES) as TravelMode[])
    .filter((m) => m !== usual)
    .map((m) => {
      const option = tripOption(m, km, pm25, group);
      return {
        ...option,
        doseChange: Math.round(option.dose - base.dose),
        co2Change: option.co2 - base.co2,
      };
    })
    .sort((a, b) => a.co2Change - b.co2Change || a.doseChange - b.doseChange);
}
