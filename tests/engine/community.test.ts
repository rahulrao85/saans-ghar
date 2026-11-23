import { describe, expect, it } from 'vitest';
import { record, weekTotals } from '../../src/engine/ledger';
import { fallbackNotice, grapStageFor, noticeFacts, outdoorCall } from '../../src/engine/notice';
import { compareSwitches, tripOption } from '../../src/engine/switches';

describe('tripOption', () => {
  it('computes time, breathed dose and CO2 for a trip', () => {
    // 6 km by two-wheeler at 22 km/h ≈ 16 min; 34 g/km → 204 g CO2
    const option = tripOption('two-wheeler', 6, 200, 'adult');
    expect(option).toMatchObject({ mode: 'two-wheeler', minutes: 16, co2: 204 });
    expect(option.dose).toBeGreaterThan(0);
  });
  it('treats a negative distance as zero', () => {
    expect(tripOption('car', -3, 200, 'adult')).toEqual({
      mode: 'car',
      minutes: 0,
      dose: 0,
      co2: 0,
    });
  });
});

describe('compareSwitches', () => {
  it('ranks lower-emission options first and leaves out the usual mode', () => {
    const switches = compareSwitches('car', 8, 220, 'adult');
    expect(switches.map((s) => s.mode)).not.toContain('car');
    expect(switches[0]?.co2Change).toBeLessThan(0);
    const metro = switches.find((s) => s.mode === 'metro');
    expect(metro?.co2Change).toBe(160 - 1112);
  });
  it('breaks emission ties by lower dose', () => {
    const switches = compareSwitches('bus', 3, 200, 'child');
    const zeroCo2 = switches.filter((s) => s.co2 === 0).map((s) => s.mode);
    expect(zeroCo2).toEqual(['cycle', 'walk']);
  });
});

describe('notice', () => {
  it.each([
    [80, 'normal'],
    [150, 'reduce'],
    [250, 'move-indoors'],
    [380, 'cancel'],
  ] as const)('AQI %d → %s', (aqi, call) => {
    expect(outdoorCall(aqi)).toBe(call);
  });
  it.each([
    [150, 0],
    [201, 1],
    [350, 2],
    [420, 3],
    [480, 4],
  ] as const)('AQI %d implies GRAP stage %d', (aqi, stage) => {
    expect(grapStageFor(aqi)).toBe(stage);
  });
  it('includes the GRAP stage only for Delhi-NCR', () => {
    expect(noticeFacts('Dwarka, Delhi', 350, true, 14).grapStage).toBe(2);
    expect(noticeFacts('Chembur, Mumbai', 350, false, null).grapStage).toBeNull();
  });
  it('writes a plain fallback notice', () => {
    expect(fallbackNotice(noticeFacts('Dwarka, Delhi', 350, true, 38))).toBe(
      'Air quality in Dwarka, Delhi: AQI 350, Very Poor (GRAP Stage 2 level). ' +
        'Please cancel all outdoor activity today and keep windows shut during smog hours. ' +
        'The cleanest hour today is around 14:00.',
    );
    expect(fallbackNotice(noticeFacts('Pune', 90, false, null))).toBe(
      'Air quality in Pune: AQI 90, Satisfactory. Outdoor play and PE can go ahead as usual.',
    );
  });
});

describe('ledger', () => {
  it('replaces a same-day entry and totals the last 7 days per member', () => {
    let entries = record([], { date: '2026-11-23', memberId: 'nani', saved: 40.2 });
    entries = record(entries, { date: '2026-11-23', memberId: 'nani', saved: 55.1 });
    entries = record(entries, { date: '2026-11-18', memberId: 'nani', saved: 10 });
    entries = record(entries, { date: '2026-11-16', memberId: 'nani', saved: 99 });
    entries = record(entries, { date: '2026-11-24', memberId: 'nani', saved: 99 });
    entries = record(entries, { date: '2026-11-20', memberId: 'aarav', saved: 7.25 });
    expect(entries).toHaveLength(5);
    expect(weekTotals(entries, '2026-11-23')).toEqual({ nani: 65.1, aarav: 7.3 });
  });
});
