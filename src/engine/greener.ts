import type { AgeGroup } from './data/breathing';
import { MINUTES_PER_HOUR } from './data/day';
import { MODES } from './data/travel';
import type { Routine } from './household';
import { compareSwitches, type Switch } from './switches';

/**
 * The low-emission alternative for a trip routine: the switch that cuts the
 * most CO₂ without making the traveller breathe more PM2.5. Distance is
 * worked out from the usual mode's speed and the routine's minutes.
 * @returns null for routines without a travel mode, or when no switch wins on both.
 */
export function greenerSwitch(routine: Routine, pm25: number, group: AgeGroup): Switch | null {
  if (routine.mode === undefined) return null;
  const km = (MODES[routine.mode].speedKmh * routine.minutes) / MINUTES_PER_HOUR;
  const better = compareSwitches(routine.mode, km, pm25, group).find(
    (s) => s.co2Change < 0 && s.doseChange <= 0,
  );
  return better ?? null;
}
