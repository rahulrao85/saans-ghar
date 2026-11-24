import { describe, expect, it } from 'vitest';
import { TOOL_DECLARATIONS, runTool } from '../../server/ai/tools';
import { FACTS } from '../fixtures/facts';

describe('TOOL_DECLARATIONS', () => {
  it('declares the four tools', () => {
    expect(TOOL_DECLARATIONS.map((t) => t.name)).toEqual([
      'air_now',
      'forecast_window',
      'member_plan',
      'inhaled_dose',
    ]);
  });
});

describe('runTool', () => {
  it('air_now returns the current reading', () => {
    expect(runTool({ name: 'air_now', args: {} }, FACTS)).toEqual({
      place: 'Chembur, Mumbai',
      aqi: 162,
      category: 'Moderate',
      pm25: 78.4,
      source: 'cpcb',
      station: 'Borivali East, Mumbai - MPCB',
      updated: '2026-11-24T10:00:00+05:30',
    });
  });

  it('forecast_window filters hours inclusively', () => {
    const out = runTool({ name: 'forecast_window', args: { from_hour: 12, to_hour: 18 } }, FACTS);
    expect(out).toEqual({
      hours: [
        { hour: 14, pm25: 52 },
        { hour: 18, pm25: 88 },
      ],
    });
  });

  it('member_plan matches names case-insensitively and adds clock times', () => {
    const result = runTool({ name: 'member_plan', args: { name: 'AAJI' } }, FACTS);
    expect(result).toEqual({
      items: [{ ...FACTS.items[0], usualTime: '6 pm', bestTime: '2 pm' }],
    });
  });

  it('member_plan returns no items for an unknown member', () => {
    expect(runTool({ name: 'member_plan', args: { name: 'Baba' } }, FACTS)).toEqual({ items: [] });
  });

  it('inhaled_dose computes micrograms', () => {
    const args = { pm25: 100, age_group: 'adult', activity: 'light', minutes: 60 };
    expect(runTool({ name: 'inhaled_dose', args }, FACTS)).toEqual({ micrograms: 72 });
  });

  it('reports an unknown tool', () => {
    expect(runTool({ name: 'nope', args: {} }, FACTS)).toEqual({ error: 'Unknown tool nope' });
  });

  it('turns invalid arguments into an error', () => {
    const base = { pm25: 5, age_group: 'adult', activity: 'rest', minutes: 5 };
    const bad = [
      { name: 'forecast_window', args: { from_hour: 'x' } },
      { name: 'member_plan', args: {} },
      { name: 'inhaled_dose', args: { ...base, pm25: -1 } },
      { name: 'inhaled_dose', args: { ...base, minutes: 5000 } },
      { name: 'inhaled_dose', args: { ...base, age_group: 'dog' } },
    ];
    for (const call of bad) {
      expect(runTool(call, FACTS)).toEqual({ error: 'Invalid arguments' });
    }
  });
});
