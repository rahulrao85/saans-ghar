import type { AirReportData } from '../schemas/air';
import type { FactItem, PlanFacts } from '../schemas/facts';
import type { Member } from './household';
import type { RoutineAdvice } from './plan';

/** Forecast hours worth sending: from now to the end of tomorrow. */
function ahead(report: AirReportData, nowHour: number): PlanFacts['forecast'] {
  return report.forecast.filter((h) => h.hour >= nowHour);
}

function itemFor(advice: RoutineAdvice, members: readonly Member[]): FactItem | null {
  const member = members.find((m) => m.id === advice.memberId);
  const routine = member?.routines.find((r) => r.id === advice.routineId);
  if (member === undefined || routine === undefined) return null;
  return {
    member: member.name,
    group: member.group,
    sensitive: member.sensitive,
    label: routine.label,
    verdict: advice.verdict,
    usualHour: advice.usualHour,
    bestHour: advice.bestHour,
    usualAqi: advice.usualAqi,
    bestAqi: advice.bestAqi,
    savedDose: advice.savedDose,
  };
}

/** The facts the AI explains and the rules fall back on: all computed here, none by the model. */
export function buildFacts(input: {
  readonly place: string;
  readonly report: AirReportData;
  readonly members: readonly Member[];
  readonly plan: readonly RoutineAdvice[];
  readonly nowHour: number;
}): PlanFacts {
  const { place, report, members, plan, nowHour } = input;
  return {
    place,
    source: report.source,
    station: report.station?.name ?? null,
    updated: report.station?.updated ?? null,
    aqi: report.aqi?.aqi ?? null,
    category: report.aqi?.band.category ?? null,
    pm25: report.pm25,
    forecast: ahead(report, nowHour),
    items: plan.map((a) => itemFor(a, members)).filter((i): i is FactItem => i !== null),
  };
}
