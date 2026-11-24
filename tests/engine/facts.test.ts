import { describe, expect, it } from 'vitest';
import { buildFacts } from '../../src/engine/facts';
import type { Member } from '../../src/engine/household';
import type { RoutineAdvice } from '../../src/engine/plan';
import type { AirReportData } from '../../src/schemas/air';

const REPORT: AirReportData = {
  source: 'cpcb',
  station: {
    name: 'Borivali East, Mumbai - MPCB',
    city: 'Mumbai',
    state: 'Maharashtra',
    updated: '2026-11-24T10:00:00+05:30',
    km: 3,
  },
  aqi: {
    aqi: 162,
    band: { category: 'Moderate', low: 101, high: 200, colour: '#ff0', health: 'ok' },
    dominant: 'PM2.5',
    subIndices: { 'PM2.5': 162 },
    complete: true,
  },
  pm25: 78.4,
  forecast: [
    { hour: 8, pm25: 90 },
    { hour: 14, pm25: 52 },
  ],
  weather: [],
  stale: false,
};

const MEMBERS: Member[] = [
  {
    id: 'aaji',
    name: 'Aaji',
    group: 'elder',
    sensitive: true,
    routines: [
      {
        id: 'walk',
        label: 'Evening walk',
        activity: 'light',
        minutes: 30,
        usualHour: 18,
        earliestHour: 15,
        latestHour: 19,
        required: false,
      },
    ],
  },
];

const advice = (over: Partial<RoutineAdvice> = {}): RoutineAdvice => ({
  memberId: 'aaji',
  routineId: 'walk',
  verdict: 'go',
  usualHour: 18,
  bestHour: 14,
  part: 'evening',
  usualAqi: 192,
  bestAqi: 115,
  usualDose: 60,
  adviceDose: 18.5,
  savedDose: 41.5,
  ...over,
});

describe('buildFacts', () => {
  it('collects the report, the forecast ahead and the plan items', () => {
    const out = buildFacts({
      place: 'Chembur',
      report: REPORT,
      members: MEMBERS,
      plan: [advice()],
      nowHour: 10,
    });
    expect(out).toEqual({
      place: 'Chembur',
      source: 'cpcb',
      station: 'Borivali East, Mumbai - MPCB',
      updated: '2026-11-24T10:00:00+05:30',
      aqi: 162,
      category: 'Moderate',
      pm25: 78.4,
      forecast: [{ hour: 14, pm25: 52 }],
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
    });
  });

  it('uses nulls when the report has no station or index, and drops unknown advice', () => {
    const out = buildFacts({
      place: 'Nowhere',
      report: { ...REPORT, station: null, aqi: null, pm25: null, source: 'model' },
      members: MEMBERS,
      plan: [advice({ memberId: 'ghost' }), advice({ routineId: 'ghost' })],
      nowHour: 0,
    });
    expect(out).toMatchObject({
      source: 'model',
      station: null,
      updated: null,
      aqi: null,
      category: null,
      pm25: null,
      items: [],
    });
    expect(out.forecast).toHaveLength(2);
  });
});
