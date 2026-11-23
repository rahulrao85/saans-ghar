/**
 * Short-term inhalation rates in litres per minute, by age group and activity.
 * Approximate means from US EPA Exposure Factors Handbook (2011), Table 6-2:
 * child = ages 3–<6, adult = 21–<31, elder = 61–<71.
 * https://www.epa.gov/expobox/exposure-factors-handbook-chapter-6
 */

/** Household member groups that breathe at different rates. */
export type AgeGroup = 'child' | 'adult' | 'elder';

/** How hard someone is breathing during an activity. */
export type Activity = 'rest' | 'light' | 'moderate' | 'vigorous';

/** Litres of air per minute. */
export const INHALATION_L_PER_MIN: Readonly<Record<AgeGroup, Readonly<Record<Activity, number>>>> =
  {
    child: { rest: 4.8, light: 11, moderate: 21, vigorous: 37 },
    adult: { rest: 4.2, light: 12, moderate: 26, vigorous: 50 },
    elder: { rest: 4.1, light: 12, moderate: 25, vigorous: 46 },
  };
