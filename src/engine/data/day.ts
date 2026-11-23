/** Part of the day, for the morning / afternoon / evening plan view. */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;

/** Start hour of each part of the day, in order. */
export const PART_STARTS: readonly (readonly [number, DayPart])[] = [
  [5, 'morning'],
  [12, 'afternoon'],
  [17, 'evening'],
  [22, 'night'],
];
