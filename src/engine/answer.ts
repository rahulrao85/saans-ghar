import type { PlanFacts } from '../schemas/facts';
import { adviceLine, airLine, totalSaved } from './explain';
import { hourLabel, micrograms } from './format';

type Rule = (q: string, facts: PlanFacts) => string | null;

/** Lowest forecast hour still ahead, if any. */
function cleanest(facts: PlanFacts): { hour: number; pm25: number } | null {
  return facts.forecast.reduce<{ hour: number; pm25: number } | null>(
    (b, h) => (b === null || h.pm25 < b.pm25 ? h : b),
    null,
  );
}

const byMember: Rule = (q, facts) => {
  const items = facts.items.filter((i) => q.includes(i.member.toLowerCase()));
  return items.length === 0 ? null : items.map(adviceLine).join('\n');
};

const bestTime: Rule = (q, facts) => {
  if (!/(when|best|time|clean|walk|open|window)/.test(q)) return null;
  const best = cleanest(facts);
  return best === null
    ? null
    : `The cleanest hour in the forecast is ${hourLabel(best.hour)} (PM2.5 ~${best.pm25} µg/m³). Plan walks and airing the house around then.`;
};

const masks: Rule = (q) =>
  /(mask|n95)/.test(q)
    ? 'Masks help only when well fitted: an N95 that seals around the nose and chin. Cloth and surgical masks do little for PM2.5, so the plan does not count any saving from them.'
    : null;

const saving: Rule = (q, facts) =>
  /(save|saving|dose|µg|ug)/.test(q)
    ? `Following today's plan, the family avoids ~${micrograms(totalSaved(facts))} of PM2.5. Dose = PM2.5 × breathing rate (by age and activity) × minutes.`
    : null;

const RULES: readonly Rule[] = [byMember, bestTime, masks, saving];

/** Answer a question from the plan facts without AI; falls back to the air headline. */
export function rulesAnswer(question: string, facts: PlanFacts): string {
  const q = question.toLowerCase();
  for (const rule of RULES) {
    const answer = rule(q, facts);
    if (answer !== null) return answer;
  }
  return `${airLine(facts)} Ask about a family member by name, the best time to go out, masks, or how much the plan saves.`;
}
