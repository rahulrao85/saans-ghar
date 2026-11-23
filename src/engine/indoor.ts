import {
  AHAM_NORMAL_SHARE,
  AHAM_SMOKE_SHARE,
  AIR_CHANGES_PER_HOUR,
  CUBIC_M_PER_HOUR_PER_CFM,
  DEPOSITION_PER_HOUR,
  PENETRATION,
  ROOM_HEIGHT_M,
  SQ_M_PER_SQ_FT,
  type WindowHabit,
} from './data/indoor';
import type { HourlyPm } from './forecast';

/** A room the family wants advice for. */
export interface Room {
  readonly name: string;
  readonly areaSqFt: number;
  readonly windows: WindowHabit;
  /** Purifier smoke CADR in cfm, or 0 for none. */
  readonly purifierCadr: number;
}

/** Purifier check for one room. */
export interface PurifierCheck {
  /** CADR (cfm) AHAM suggests for normal days and for smog days. */
  readonly normalCadr: number;
  readonly smogCadr: number;
  readonly verdict: 'none' | 'undersized' | 'normal-only' | 'enough';
}

/** Earliest hour of the day it is reasonable to air out a home. */
const AIRING_FROM = 6;
/** Latest hour (exclusive) to air out a home. */
const AIRING_UNTIL = 22;

/**
 * Steady-state indoor PM2.5 from a single well-mixed room model:
 * C_in = P·a·C_out / (a + k + CADR/V).
 */
export function estimateIndoor(outdoorPm25: number, room: Room): number {
  const volume = room.areaSqFt * SQ_M_PER_SQ_FT * ROOM_HEIGHT_M;
  const airChanges = AIR_CHANGES_PER_HOUR[room.windows];
  const cleaning = volume > 0 ? (room.purifierCadr * CUBIC_M_PER_HOUR_PER_CFM) / volume : 0;
  const removal = airChanges + DEPOSITION_PER_HOUR + cleaning;
  return Math.round((PENETRATION * airChanges * Math.max(0, outdoorPm25)) / removal);
}

/** Compare a room's purifier with the AHAM sizing rule. */
export function checkPurifier(room: Room): PurifierCheck {
  const normalCadr = Math.ceil(room.areaSqFt * AHAM_NORMAL_SHARE);
  const smogCadr = Math.ceil(room.areaSqFt * AHAM_SMOKE_SHARE);
  return {
    normalCadr,
    smogCadr,
    verdict: purifierVerdict(room.purifierCadr, normalCadr, smogCadr),
  };
}

function purifierVerdict(
  cadr: number,
  normalCadr: number,
  smogCadr: number,
): PurifierCheck['verdict'] {
  if (cadr <= 0) return 'none';
  if (cadr < normalCadr) return 'undersized';
  return cadr < smogCadr ? 'normal-only' : 'enough';
}

/**
 * The cleanest waking hour to open windows, from the forecast.
 * @returns null when no waking hour is in the forecast.
 */
export function bestAiringHour(hours: readonly HourlyPm[]): HourlyPm | null {
  const waking = hours.filter((h) => h.hour >= AIRING_FROM && h.hour < AIRING_UNTIL);
  return waking.reduce<HourlyPm | null>((b, h) => (b === null || h.pm25 < b.pm25 ? h : b), null);
}

/** What a measured indoor reading says about the home. */
export type IndoorFinding = 'source-inside' | 'leaky' | 'well-sealed';

/** Indoor/outdoor ratios that separate the findings. */
const LEAKY_RATIO = 0.8;
const SOURCE_RATIO = 1;

/** Read a measured indoor value against the outdoor value. */
export function interpretReading(indoorPm25: number, outdoorPm25: number): IndoorFinding {
  const ratio = outdoorPm25 > 0 ? indoorPm25 / outdoorPm25 : SOURCE_RATIO;
  if (ratio >= SOURCE_RATIO) return 'source-inside';
  return ratio >= LEAKY_RATIO ? 'leaky' : 'well-sealed';
}
