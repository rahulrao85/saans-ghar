import { pm25Index } from './aqi';
import { HOURS_PER_DAY, MINUTES_PER_HOUR, PART_STARTS, type DayPart } from './data/day';
import { inhaledDose, roundTenth } from './dose';
import { meanOver, type HourlyPm } from './forecast';
import { isVulnerable, type Member, type Routine } from './household';

/** What we advise for one routine today. */
export type Verdict = 'go' | 'shorten' | 'mask' | 'indoors';

/** Advice for one routine, with the numbers behind it. */
export interface RoutineAdvice {
  readonly memberId: string;
  readonly routineId: string;
  readonly verdict: Verdict;
  readonly usualHour: number;
  readonly bestHour: number;
  readonly part: DayPart;
  /** PM2.5 sub-index at the usual and best hours. */
  readonly usualAqi: number;
  readonly bestAqi: number;
  /** µg of PM2.5 breathed in by following the advice vs the usual plan. */
  readonly usualDose: number;
  readonly adviceDose: number;
  readonly savedDose: number;
}

/** Index limits for outdoor activity; vulnerable members use the lower ones. */
const LIMITS = {
  vulnerable: { go: 100, shorten: 200 },
  adult: { go: 200, shorten: 300 },
} as const;
/** Shortened activities keep this share of the planned time. */
const SHORTEN_SHARE = 0.5;
/** Indoor PM2.5 as a share of outdoor with windows shut, no purifier (typical Indian home, approx.). */
export const INDOOR_SHARE = 0.7;

/** Advice for every routine of every member, sorted by best hour. */
export function planDay(members: readonly Member[], hours: readonly HourlyPm[]): RoutineAdvice[] {
  return members
    .flatMap((m) => m.routines.map((r) => adviseRoutine(m, r, hours)))
    .filter((a): a is RoutineAdvice => a !== null)
    .sort((a, b) => a.bestHour - b.bestHour);
}

/**
 * Pick the cleanest allowed start hour, then decide how to do the routine.
 * @returns null when the forecast does not cover the routine's window.
 */
export function adviseRoutine(
  member: Member,
  routine: Routine,
  hours: readonly HourlyPm[],
): RoutineAdvice | null {
  const span = Math.max(1, Math.ceil(routine.minutes / MINUTES_PER_HOUR));
  const usual = meanOver(hours, routine.usualHour, span);
  const best = cleanestStart(hours, routine, span);
  if (usual === null || best === null) return null;
  const bestAqi = pm25Index(best.pm25);
  const verdict = decide(bestAqi, isVulnerable(member), routine.required);
  const usualDose = inhaledDose(usual, member.group, routine.activity, routine.minutes);
  const adviceDose = doseFor(verdict, best.pm25, member, routine);
  return {
    memberId: member.id,
    routineId: routine.id,
    verdict,
    usualHour: routine.usualHour,
    bestHour: best.hour,
    part: partOfDay(best.hour),
    usualAqi: pm25Index(usual),
    bestAqi,
    usualDose,
    adviceDose,
    savedDose: roundTenth(Math.max(0, usualDose - adviceDose)),
  };
}

/** Lowest mean PM2.5 start within the routine's window; ties keep the usual hour. */
export function cleanestStart(
  hours: readonly HourlyPm[],
  routine: Routine,
  span: number,
): { hour: number; pm25: number } | null {
  let best: { hour: number; pm25: number } | null = null;
  for (let h = routine.earliestHour; h <= routine.latestHour; h++) {
    const pm25 = meanOver(hours, h, span);
    if (pm25 === null) continue;
    const better =
      best === null || pm25 < best.pm25 || (pm25 === best.pm25 && h === routine.usualHour);
    if (better) best = { hour: h, pm25 };
  }
  return best;
}

/** The verdict for an activity at a given PM2.5 sub-index. */
export function decide(aqi: number, vulnerable: boolean, required: boolean): Verdict {
  const limit = vulnerable ? LIMITS.vulnerable : LIMITS.adult;
  if (aqi <= limit.go) return 'go';
  if (aqi <= limit.shorten) return required ? 'mask' : 'shorten';
  return required ? 'mask' : 'indoors';
}

/** Morning, afternoon, evening or night for an hour since midnight. */
export function partOfDay(hour: number): DayPart {
  const h = ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  let part: DayPart = 'night';
  for (const [start, name] of PART_STARTS) if (h >= start) part = name;
  return part;
}

/**
 * Dose if the advice is followed. A mask is advised but not credited:
 * real-world fit varies too much to promise a number.
 */
function doseFor(verdict: Verdict, pm25: number, member: Member, routine: Routine): number {
  if (verdict === 'indoors') {
    return inhaledDose(pm25 * INDOOR_SHARE, member.group, 'light', routine.minutes);
  }
  const minutes = verdict === 'shorten' ? routine.minutes * SHORTEN_SHARE : routine.minutes;
  return inhaledDose(pm25, member.group, routine.activity, minutes);
}
