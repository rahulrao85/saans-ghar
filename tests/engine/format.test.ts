import { describe, expect, it } from 'vitest';
import { formatIst, hourLabel, istDate, micrograms } from '../../src/engine/format';

describe('hourLabel', () => {
  it('labels clock hours', () => {
    expect(hourLabel(0)).toBe('12 am');
    expect(hourLabel(7)).toBe('7 am');
    expect(hourLabel(12)).toBe('12 pm');
    expect(hourLabel(18)).toBe('6 pm');
  });

  it('marks tomorrow and wraps negatives', () => {
    expect(hourLabel(24)).toBe('tomorrow 12 am');
    expect(hourLabel(30)).toBe('tomorrow 6 am');
    expect(hourLabel(-1)).toBe('11 pm');
  });
});

describe('formatIst', () => {
  it('writes house-style dates', () => {
    expect(formatIst('2026-11-24T23:00:00+05:30')).toBe('24-Nov-2026 23:00 IST');
  });

  it('keeps an unknown month number and leaves non-ISO text alone', () => {
    expect(formatIst('2026-13-01T01:02:00')).toBe('01-13-2026 01:02 IST');
    expect(formatIst('23-11-2026 23:00:00')).toBe('23-11-2026 23:00:00');
  });
});

describe('istDate', () => {
  it('rolls into the next day after 18:30 UTC', () => {
    expect(istDate(Date.UTC(2026, 10, 24, 5, 30))).toBe('2026-11-24');
    expect(istDate(Date.UTC(2026, 10, 24, 20, 0))).toBe('2026-11-25');
  });
});

describe('micrograms', () => {
  it('rounds and groups Indian style', () => {
    expect(micrograms(41.5)).toBe('42 µg');
    expect(micrograms(1240.4)).toBe('1,240 µg');
    expect(micrograms(124000)).toBe('1,24,000 µg');
  });
});
