import { INHALATION_L_PER_MIN, type Activity, type AgeGroup } from './data/breathing';

const LITRES_PER_CUBIC_METRE = 1000;
const TENTHS = 10;

/**
 * Mass of PM2.5 breathed in during an activity: concentration × air breathed.
 * @param concentration PM2.5 in µg/m³.
 * @returns micrograms inhaled, rounded to one decimal place; 0 for invalid input.
 */
export function inhaledDose(
  concentration: number,
  group: AgeGroup,
  activity: Activity,
  minutes: number,
): number {
  if (!(concentration > 0) || !(minutes > 0)) return 0;
  const cubicMetres = (INHALATION_L_PER_MIN[group][activity] * minutes) / LITRES_PER_CUBIC_METRE;
  return roundTenth(concentration * cubicMetres);
}

/** Round to one decimal place. */
export function roundTenth(value: number): number {
  return Math.round(value * TENTHS) / TENTHS;
}
