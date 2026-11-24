import { describe, expect, it } from 'vitest';
import { greenerSwitch } from '../../src/engine/greener';
import type { Routine } from '../../src/engine/household';

const commute: Routine = {
  id: 'c',
  label: 'Office commute',
  activity: 'light',
  minutes: 40,
  usualHour: 9,
  earliestHour: 8,
  latestHour: 10,
  required: true,
  mode: 'two-wheeler',
};

describe('greenerSwitch', () => {
  it('suggests a mode that cuts CO2 without raising the dose', () => {
    const s = greenerSwitch(commute, 120, 'adult');
    expect(s).not.toBeNull();
    expect(s?.co2Change).toBeLessThan(0);
    expect(s?.doseChange).toBeLessThanOrEqual(0);
  });
  it('returns null for routines without a travel mode', () => {
    expect(greenerSwitch({ ...commute, mode: undefined }, 120, 'adult')).toBeNull();
  });
  it('returns null when nothing emits less (walking already emits nothing)', () => {
    expect(greenerSwitch({ ...commute, mode: 'walk' }, 120, 'adult')).toBeNull();
  });
});
