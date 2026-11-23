import { roundTenth } from './dose';

/** Dose a household avoided on one day by following the plan. */
export interface LedgerEntry {
  /** ISO date, YYYY-MM-DD. */
  readonly date: string;
  readonly memberId: string;
  /** µg of PM2.5 avoided. */
  readonly saved: number;
}

const DAYS_IN_WEEK = 7;
const MS_PER_DAY = 86_400_000;

/** Add or replace one member's entry for a day (re-planning the same day overwrites). */
export function record(entries: readonly LedgerEntry[], entry: LedgerEntry): LedgerEntry[] {
  const others = entries.filter((e) => !(e.date === entry.date && e.memberId === entry.memberId));
  return [...others, entry];
}

/** Total µg avoided per member over the 7 days ending on `today` (ISO date). */
export function weekTotals(
  entries: readonly LedgerEntry[],
  today: string,
): Readonly<Record<string, number>> {
  const end = Date.parse(today);
  const start = end - (DAYS_IN_WEEK - 1) * MS_PER_DAY;
  const totals: Record<string, number> = {};
  for (const e of entries) {
    const t = Date.parse(e.date);
    if (t < start || t > end) continue;
    totals[e.memberId] = roundTenth((totals[e.memberId] ?? 0) + e.saved);
  }
  return totals;
}
