import { z } from 'zod';
import type { LedgerEntry } from '../engine/ledger';

const MAX_NAME = 40;
const MAX_MEMBERS = 10;
const MAX_ROUTINES = 5;
const LAST_HOUR = 23;
const MAX_MINUTES = 600;

const routineSchema = z.object({
  id: z.string(),
  label: z.string().max(MAX_NAME),
  activity: z.enum(['rest', 'light', 'moderate', 'vigorous']),
  minutes: z.number().int().min(1).max(MAX_MINUTES),
  usualHour: z.number().int().min(0).max(LAST_HOUR),
  earliestHour: z.number().int().min(0).max(LAST_HOUR),
  latestHour: z.number().int().min(0).max(LAST_HOUR),
  required: z.boolean(),
  mode: z.enum(['walk', 'cycle', 'two-wheeler', 'auto', 'bus', 'metro', 'car']).optional(),
});

const memberSchema = z.object({
  id: z.string(),
  name: z.string().max(MAX_NAME),
  group: z.enum(['child', 'adult', 'elder']),
  sensitive: z.boolean(),
  routines: z.array(routineSchema).max(MAX_ROUTINES),
});

const placeSchema = z.object({ label: z.string(), lat: z.number(), lon: z.number() });

/**
 * What the app remembers, in this browser only. The server receives the chosen
 * coordinates (and rounds them to ~1 km); AI requests carry first names and
 * routine labels, never coordinates.
 */
export const householdSchema = z.object({
  place: placeSchema.nullable(),
  members: z.array(memberSchema).max(MAX_MEMBERS),
});
/** The saved household: place and members. */
export type Household = z.infer<typeof householdSchema>;
/** A chosen place with its label. */
export type Place = z.infer<typeof placeSchema>;
/** One saved family member. */
export type MemberData = z.infer<typeof memberSchema>;
/** One saved routine. */
export type RoutineData = z.infer<typeof routineSchema>;

const ledgerSchema = z.array(
  z.object({ date: z.string(), memberId: z.string(), saved: z.number().min(0) }),
);

const HOUSEHOLD_KEY = 'saans-ghar:household';
const LEDGER_KEY = 'saans-ghar:ledger';

/** Read and validate a stored value; anything missing or malformed gives the fallback. */
function read<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the app still works for this visit.
  }
}

/** A new visitor: no place, no members. */
export const EMPTY_HOUSEHOLD: Household = { place: null, members: [] };

/** The saved household, or an empty one if nothing valid is stored. */
export const loadHousehold = (): Household => read(HOUSEHOLD_KEY, householdSchema, EMPTY_HOUSEHOLD);
/** Save the household in this browser. */
export const saveHousehold = (h: Household): void => {
  write(HOUSEHOLD_KEY, h);
};
/** The saved weekly ledger, or an empty one. */
export const loadLedger = (): LedgerEntry[] => read(LEDGER_KEY, ledgerSchema, []);
/** Save the weekly ledger in this browser. */
export const saveLedger = (entries: readonly LedgerEntry[]): void => {
  write(LEDGER_KEY, entries);
};

/** A short random id for new members and routines. */
export function newId(): string {
  return crypto.randomUUID().slice(0, 'xxxxxxxx'.length);
}
