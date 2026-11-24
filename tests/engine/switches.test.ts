import { describe, expect, it } from 'vitest';
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
