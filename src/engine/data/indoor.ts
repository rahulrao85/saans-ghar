/**
 * Inputs for the single-room indoor PM2.5 model. All values are typical
 * literature ranges, picked mid-range, and shown in the app as approximate.
 */

/** How the household keeps its windows. */
export type WindowHabit = 'shut' | 'sometimes' | 'open';

/** Air changes per hour by window habit (approx.; homes vary widely). */
export const AIR_CHANGES_PER_HOUR: Readonly<Record<WindowHabit, number>> = {
  shut: 0.5,
  sometimes: 1.5,
  open: 5,
};

/** Share of outdoor PM2.5 that gets through the building shell. */
export const PENETRATION = 0.8;
/** PM2.5 settling onto surfaces, per hour. */
export const DEPOSITION_PER_HOUR = 0.2;
/** Room height in metres (9 ft). */
export const ROOM_HEIGHT_M = 2.74;
/** Square metres in a square foot. */
export const SQ_M_PER_SQ_FT = 0.0929;
/** Cubic metres per hour in one cubic foot per minute. */
export const CUBIC_M_PER_HOUR_PER_CFM = 1.699;

/**
 * AHAM sizing: smoke CADR (cfm) should be at least two-thirds of the floor area
 * (sq ft) for normal use; for smoke-level pollution AHAM suggests the full area.
 * https://ahamverifide.org/ahams-air-filtration-standards/
 */
export const AHAM_NORMAL_SHARE = 2 / 3;
/** AHAM smog-day sizing: smoke CADR (cfm) at least equal to the floor area (sq ft). */
export const AHAM_SMOKE_SHARE = 1;

/** A common indoor source of particles and a cleaner swap. */
export interface IndoorSource {
  readonly id: string;
  readonly label: string;
  readonly swap: string;
  readonly evidence: string;
  readonly url?: string;
}

/** Indoor sources common in Indian homes, with evidence for each claim. */
export const INDOOR_SOURCES: readonly IndoorSource[] = [
  {
    id: 'coil',
    label: 'Mosquito coil',
    swap: 'Use a bed net, window mesh or an electric repellent instead.',
    evidence: 'One coil gives off as much PM2.5 as 75–137 cigarettes (Liu et al., 2003).',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1241646',
  },
  {
    id: 'incense',
    label: 'Incense / dhoop',
    swap: 'Light it only with a window open, away from bedrooms, and put it out after puja.',
    evidence: 'Burning incense raises indoor fine particles sharply in closed rooms.',
  },
  {
    id: 'frying',
    label: 'Frying and tadka',
    swap: 'Cover pans, run the exhaust or chimney, and open the kitchen window while cooking.',
    evidence: 'High-heat oil cooking is one of the largest indoor PM2.5 sources at home.',
  },
  {
    id: 'sweeping',
    label: 'Dry sweeping',
    swap: 'Wet-mop instead; dry sweeping lifts settled dust back into the air.',
    evidence: 'Re-suspended dust raises coarse and fine particles indoors.',
  },
];
