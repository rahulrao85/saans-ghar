import { HOURS_PER_DAY } from './data/day';
import type { Member, Routine } from './household';

/**
 * Look ahead: a routine whose whole window has passed moves to tomorrow (an
 * evening visit plans tomorrow's school run); one still open today starts no
 * earlier than now.
 */
export function upcoming(routine: Routine, nowHour: number): Routine {
  // Still possible today: never suggest an hour that has already gone.
  if (routine.latestHour >= nowHour) {
    return { ...routine, earliestHour: Math.max(routine.earliestHour, nowHour) };
  }
  return {
    ...routine,
    usualHour: routine.usualHour + HOURS_PER_DAY,
    earliestHour: routine.earliestHour + HOURS_PER_DAY,
    latestHour: routine.latestHour + HOURS_PER_DAY,
  };
}

/** Every member with their routines moved to the next time they happen. */
export function lookAhead(members: readonly Member[], nowHour: number): Member[] {
  return members.map((m) => ({ ...m, routines: m.routines.map((r) => upcoming(r, nowHour)) }));
}
