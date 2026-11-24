import { describe, expect, it } from 'vitest';
import { calibrate, meanOver, type HourlyPm } from '../../src/engine/forecast';

/** 24 hours: dirty mornings and nights, cleaner afternoons (a Delhi winter shape). */
const DAY: HourlyPm[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  pm25: hour >= 12 && hour <= 16 ? 80 : 260,
}));

describe('forecast helpers', () => {
  it('scales the model to the station reading', () => {
    const result = calibrate(
      [
        { hour: 20, pm25: 72 },
        { hour: 21, pm25: 60 },
      ],
      247,
      20,
    );
    expect(result.factor).toBeCloseTo(3.43, 2);
    expect(result.hours[1]?.pm25).toBe(206);
  });
  it('clamps implausible factors and tolerates a missing current hour', () => {
    expect(calibrate([{ hour: 1, pm25: 10 }], 900, 1).factor).toBe(4);
    expect(calibrate([{ hour: 1, pm25: 10 }], 900, 5).factor).toBe(1);
    expect(calibrate([{ hour: 1, pm25: 0 }], 90, 1).factor).toBe(1);
  });
  it('averages a span and gives null for gaps', () => {
    expect(meanOver(DAY, 11, 2)).toBe(170);
    expect(meanOver(DAY, 23, 2)).toBeNull();
  });
});
