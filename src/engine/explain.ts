import type { FactItem, PlanFacts } from '../schemas/facts';
import { hourLabel, micrograms } from './format';
import type { Verdict } from './plan';

/** What each verdict means, said plainly. */
const VERDICT_TEXT: Readonly<Record<Verdict, string>> = {
  go: 'go ahead',
  shorten: 'keep it to half the time',
  mask: 'go, but wear a well-fitted N95',
  indoors: 'do it indoors today',
};

/** One-line advice for a plan item, with the why and the saving. */
export function adviceLine(item: FactItem): string {
  const moved = item.bestHour !== item.usualHour;
  const when = moved
    ? `move it from ${hourLabel(item.usualHour)} to ${hourLabel(item.bestHour)}`
    : `keep ${hourLabel(item.bestHour)}`;
  const why = moved
    ? `PM2.5 index drops from ${item.usualAqi} to ${item.bestAqi}`
    : `${hourLabel(item.bestHour)} is already the cleanest slot (index ${item.bestAqi})`;
  const saves = item.savedDose > 0 ? ` Saves ~${micrograms(item.savedDose)} of PM2.5.` : '';
  return `${item.member}, ${item.label}: ${when} and ${VERDICT_TEXT[item.verdict]}. Why: ${why}.${saves}`;
}

/** Total dose the plan saves, across the family. */
export function totalSaved(facts: PlanFacts): number {
  return facts.items.reduce((sum, i) => sum + i.savedDose, 0);
}

/** Headline about the air now, naming the source. */
export function airLine(facts: PlanFacts): string {
  if (facts.aqi === null) return `No live reading for ${facts.place} right now.`;
  const from =
    facts.source === 'cpcb' && facts.station !== null
      ? `CPCB station ${facts.station}`
      : 'the Open-Meteo model (no CPCB station within 25 km)';
  return `Air in ${facts.place}: AQI ${facts.aqi} (${facts.category ?? 'unknown'}), from ${from}.`;
}

/** The plan in plain English, built only from code-computed facts. */
export function rulesExplain(facts: PlanFacts): string {
  const lines = [airLine(facts), ...facts.items.map(adviceLine)];
  const saved = totalSaved(facts);
  if (saved > 0) lines.push(`Together the family avoids ~${micrograms(saved)} of PM2.5 today.`);
  return lines.join('\n');
}
