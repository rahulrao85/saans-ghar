import type { Activity, AgeGroup } from './data/breathing';

/** Ways to get somewhere; used for exposure and emissions. */
export type TravelMode = 'walk' | 'cycle' | 'two-wheeler' | 'auto' | 'bus' | 'metro' | 'car';

/** Something a household member does outdoors on a normal day. */
export interface Routine {
  readonly id: string;
  readonly label: string;
  readonly activity: Activity;
  readonly minutes: number;
  /** Usual start, in hours since local midnight. */
  readonly usualHour: number;
  /** Earliest and latest start the family would accept. */
  readonly earliestHour: number;
  readonly latestHour: number;
  /** True for trips that cannot be skipped (school run, commute). */
  readonly required: boolean;
  readonly mode?: TravelMode;
}

/** One person in the household. */
export interface Member {
  readonly id: string;
  readonly name: string;
  readonly group: AgeGroup;
  /** Asthma, heart or lung condition, pregnancy, or a sleep-breathing disorder. */
  readonly sensitive: boolean;
  readonly routines: readonly Routine[];
}

/** Children, older adults and sensitive members get more cautious advice. */
export function isVulnerable(member: Member): boolean {
  return member.sensitive || member.group !== 'adult';
}
