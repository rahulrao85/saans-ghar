import { describe, expect, it } from 'vitest';
import { INDOOR_SOURCES } from '../../src/engine/data/indoor';
import {
  bestAiringHour,
  checkPurifier,
  estimateIndoor,
  interpretReading,
  type Room,
} from '../../src/engine/indoor';

const bedroom: Room = { name: 'Bedroom', areaSqFt: 120, windows: 'shut', purifierCadr: 0 };

describe('estimateIndoor', () => {
  it('is lower than outdoors with windows shut', () => {
    // 0.8 × 0.5 × 250 / (0.5 + 0.2) ≈ 143
    expect(estimateIndoor(250, bedroom)).toBe(143);
  });
  it('drops sharply with an adequate purifier', () => {
    expect(estimateIndoor(250, { ...bedroom, purifierCadr: 120 })).toBeLessThan(25);
  });
  it('rises with open windows and never goes negative', () => {
    expect(estimateIndoor(250, { ...bedroom, windows: 'open' })).toBe(192);
    expect(estimateIndoor(-10, bedroom)).toBe(0);
  });
  it('handles a zero-size room without dividing by zero', () => {
    expect(estimateIndoor(100, { ...bedroom, areaSqFt: 0, purifierCadr: 100 })).toBe(57);
  });
});

describe('checkPurifier', () => {
  it.each([
    [0, 'none'],
    [60, 'undersized'],
    [100, 'normal-only'],
    [130, 'enough'],
  ] as const)('CADR %d in 120 sq ft is %s', (cadr, verdict) => {
    expect(checkPurifier({ ...bedroom, purifierCadr: cadr })).toEqual({
      normalCadr: 80,
      smogCadr: 120,
      verdict,
    });
  });
});

describe('bestAiringHour', () => {
  it('picks the cleanest waking hour', () => {
    const hours = [
      { hour: 3, pm25: 20 },
      { hour: 9, pm25: 200 },
      { hour: 14, pm25: 90 },
      { hour: 23, pm25: 10 },
    ];
    expect(bestAiringHour(hours)).toEqual({ hour: 14, pm25: 90 });
  });
  it('keeps an earlier hour when a later one is dirtier', () => {
    expect(
      bestAiringHour([
        { hour: 9, pm25: 50 },
        { hour: 14, pm25: 90 },
      ])?.hour,
    ).toBe(9);
  });
  it('returns null without waking hours', () => {
    expect(bestAiringHour([{ hour: 2, pm25: 50 }])).toBeNull();
  });
});

describe('interpretReading', () => {
  it.each([
    [300, 250, 'source-inside'],
    [210, 250, 'leaky'],
    [80, 250, 'well-sealed'],
    [40, 0, 'source-inside'],
  ] as const)('indoor %d vs outdoor %d → %s', (indoor, outdoor, finding) => {
    expect(interpretReading(indoor, outdoor)).toBe(finding);
  });
});

describe('INDOOR_SOURCES', () => {
  it('gives every source a swap and evidence', () => {
    for (const s of INDOOR_SOURCES) {
      expect(s.swap.length).toBeGreaterThan(10);
      expect(s.evidence.length).toBeGreaterThan(10);
    }
  });
});
