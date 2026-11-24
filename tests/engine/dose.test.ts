import { describe, expect, it } from 'vitest';
import { inhaledDose, roundTenth } from '../../src/engine/dose';

describe('inhaledDose', () => {
  it('multiplies concentration by air breathed', () => {
    // 100 µg/m³ × 12 L/min × 60 min = 0.72 m³ → 72 µg
    expect(inhaledDose(100, 'adult', 'light', 60)).toBe(72);
  });
  it('returns 0 for zero or invalid inputs', () => {
    expect(inhaledDose(0, 'adult', 'light', 60)).toBe(0);
    expect(inhaledDose(100, 'adult', 'light', -5)).toBe(0);
    expect(inhaledDose(Number.NaN, 'child', 'rest', 5)).toBe(0);
  });
});

describe('roundTenth', () => {
  it('rounds to one decimal place', () => {
    expect(roundTenth(41.46)).toBe(41.5);
    expect(roundTenth(2)).toBe(2);
  });
});
