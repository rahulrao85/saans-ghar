import { buildFacts } from '../engine/facts';
import { istHour } from '../engine/geoTypes';
import { record, type LedgerEntry } from '../engine/ledger';
import { planDay, type RoutineAdvice } from '../engine/plan';
import { lookAhead } from '../engine/schedule';
import { istDate } from '../engine/format';
import type { AirReportData } from '../schemas/air';
import type { PlanFacts } from '../schemas/facts';
import type { Household } from './household';

/** Everything the screens show, worked out from the household and the air report. */
export interface Derived {
  readonly nowHour: number;
  readonly advice: readonly RoutineAdvice[];
  readonly facts: PlanFacts | null;
}

/** Plan each member's next routines against the forecast. */
export function derive(household: Household, report: AirReportData | null, nowMs: number): Derived {
  const nowHour = istHour(nowMs);
  if (report === null || household.place === null) return { nowHour, advice: [], facts: null };
  const members = lookAhead(household.members, nowHour);
  const advice = planDay(members, report.forecast);
  const facts = buildFacts({
    place: household.place.label,
    report,
    members,
    plan: advice,
    nowHour,
  });
  return { nowHour, advice, facts };
}

/** Today's saving per member, added to the ledger (re-planning the same day overwrites). */
export function addToLedger(
  entries: readonly LedgerEntry[],
  advice: readonly RoutineAdvice[],
  nowMs: number,
): LedgerEntry[] {
  const date = istDate(nowMs);
  const perMember = new Map<string, number>();
  for (const a of advice) perMember.set(a.memberId, (perMember.get(a.memberId) ?? 0) + a.savedDose);
  let next = [...entries];
  for (const [memberId, saved] of perMember) next = record(next, { date, memberId, saved });
  return next;
}
