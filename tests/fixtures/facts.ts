import type { PlanFacts } from '../../src/schemas/facts';

/** A valid plan for one elder with one evening walk worth moving. */
export const FACTS: PlanFacts = {
  place: 'Chembur, Mumbai',
  source: 'cpcb',
  station: 'Borivali East, Mumbai - MPCB',
  updated: '2026-11-24T10:00:00+05:30',
  aqi: 162,
  category: 'Moderate',
  pm25: 78.4,
  forecast: [
    { hour: 10, pm25: 78 },
    { hour: 14, pm25: 52 },
    { hour: 18, pm25: 88 },
  ],
  items: [
    {
      member: 'Aaji',
      group: 'elder',
      sensitive: true,
      label: 'Evening walk',
      verdict: 'go',
      usualHour: 18,
      bestHour: 14,
      usualAqi: 192,
      bestAqi: 115,
      savedDose: 41.5,
    },
  ],
};

/** The same facts with some fields replaced. */
export function facts(over: Partial<PlanFacts> = {}): PlanFacts {
  return { ...FACTS, ...over };
}
