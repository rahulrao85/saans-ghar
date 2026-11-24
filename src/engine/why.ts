import type { WeatherHourData } from './weatherTypes';

/** Below this mixing height (m) smoke is trapped near the ground (winter inversion). */
const LOW_MIXING_M = 500;
/** A difference smaller than this is not worth explaining. */
const MIN_DIFFERENCE_M = 150;
const ROUND_TO_M = 10;

const metres = (m: number): number => Math.round(m / ROUND_TO_M) * ROUND_TO_M;

/**
 * Why one hour is cleaner than another, from the weather: a deeper mixing
 * layer and more wind dilute pollution. Null when the weather does not explain it.
 */
export function weatherReason(
  weather: readonly WeatherHourData[],
  usualHour: number,
  bestHour: number,
): string | null {
  const usual = weather.find((w) => w.hour === usualHour);
  const best = weather.find((w) => w.hour === bestHour);
  if (usual === undefined || best === undefined) return null;
  if (best.mixingHeightM - usual.mixingHeightM < MIN_DIFFERENCE_M) return null;
  const trapped =
    usual.mixingHeightM < LOW_MIXING_M ? ', so smoke stays trapped near the ground' : '';
  return `The air layer that dilutes smoke is ~${metres(best.mixingHeightM)} m deep then, versus ~${metres(usual.mixingHeightM)} m at the usual time${trapped}.`;
}
