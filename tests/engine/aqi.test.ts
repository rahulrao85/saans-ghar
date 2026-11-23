import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { bandFor, computeAqi, concentrationFor, subIndex } from '../../src/engine/aqi';
import { AQI_BANDS, BREAKPOINTS, type Pollutant } from '../../src/engine/data/naqi';

describe('subIndex', () => {
  it.each([
    ['PM2.5', 0, 0],
    ['PM2.5', 30, 50],
    ['PM2.5', 45, 75],
    ['PM2.5', 247, 398],
    ['PM2.5', 300, 439],
    ['PM10', 250, 200],
    ['CO', 1.05, 50],
    ['OZONE', 168, 200],
  ] as const)('%s at %d gives %d', (pollutant, value, expected) => {
    expect(subIndex(pollutant, value)).toBe(expected);
  });

  it('caps at 500 beyond the last breakpoint', () => {
    expect(subIndex('PM2.5', 999)).toBe(500);
  });

  it('rejects negative and non-finite values', () => {
    expect(subIndex('PM10', -1)).toBeNull();
    expect(subIndex('PM10', Number.NaN)).toBeNull();
  });

  it('never decreases as concentration rises', () => {
    const pollutants = Object.keys(BREAKPOINTS) as Pollutant[];
    fc.assert(
      fc.property(
        fc.constantFrom(...pollutants),
        fc.double({ min: 0, max: 3000, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        (p, v, step) => (subIndex(p, v + step) ?? 0) >= (subIndex(p, v) ?? 0),
      ),
    );
  });
});

describe('bandFor', () => {
  it('maps each band edge to its own band', () => {
    for (const band of AQI_BANDS) {
      expect(bandFor(band.low).category).toBe(band.category);
      expect(bandFor(band.high).category).toBe(band.category);
    }
  });

  it('maps values above 500 to Severe', () => {
    expect(bandFor(650).category).toBe('Severe');
  });
});

describe('computeAqi', () => {
  it('takes the highest sub-index and names the dominant pollutant', () => {
    const result = computeAqi([
      { pollutant: 'PM2.5', value: 247 },
      { pollutant: 'PM10', value: 300 },
      { pollutant: 'NO2', value: 60 },
    ]);
    expect(result).toMatchObject({ aqi: 398, dominant: 'PM2.5', complete: true });
    expect(result?.band.category).toBe('Very Poor');
    expect(result?.subIndices.PM10).toBe(250);
  });

  it('keeps the worst reading when a pollutant repeats', () => {
    const result = computeAqi([
      { pollutant: 'PM10', value: 40 },
      { pollutant: 'PM10', value: 120 },
    ]);
    expect(result?.subIndices.PM10).toBe(114);
  });

  it('marks the index incomplete with too few pollutants or no particulates', () => {
    expect(computeAqi([{ pollutant: 'PM2.5', value: 50 }])?.complete).toBe(false);
    const gases = computeAqi([
      { pollutant: 'NO2', value: 50 },
      { pollutant: 'SO2', value: 50 },
      { pollutant: 'CO', value: 1 },
    ]);
    expect(gases?.complete).toBe(false);
  });

  it('returns null when nothing is usable', () => {
    expect(computeAqi([])).toBeNull();
    expect(computeAqi([{ pollutant: 'PM10', value: -5 }])).toBeNull();
  });
});

describe('concentrationFor', () => {
  it.each([
    ['PM2.5', 0, 0],
    ['PM2.5', 50, 30],
    ['PM2.5', 75, 45.2],
    ['PM10', 200, 250],
    ['PM2.5', 500, 380],
    ['PM2.5', 650, 380],
  ] as const)('%s index %d is about %d', (pollutant, index, expected) => {
    expect(concentrationFor(pollutant, index)).toBe(expected);
  });

  it('round-trips with subIndex', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (index) => {
        const c = concentrationFor('PM10', index) ?? -1;
        return Math.abs((subIndex('PM10', c) ?? -1) - index) <= 1;
      }),
    );
  });

  it('rejects invalid indices', () => {
    expect(concentrationFor('NO2', -3)).toBeNull();
    expect(concentrationFor('NO2', Number.NaN)).toBeNull();
  });
});
