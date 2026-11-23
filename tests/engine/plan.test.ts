import { describe, expect, it } from 'vitest';
import { inhaledDose } from '../../src/engine/dose';
import { calibrate, meanOver, type HourlyPm } from '../../src/engine/forecast';
import { isVulnerable, type Member, type Routine } from '../../src/engine/household';
import { adviseRoutine, cleanestStart, decide, partOfDay, planDay } from '../../src/engine/plan';

/** 24 hours: dirty mornings and nights, cleaner afternoons (a Delhi winter shape). */
const DAY: HourlyPm[] = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  pm25: hour >= 12 && hour <= 16 ? 80 : 260,
}));

const walk: Routine = {
  id: 'walk',
  label: 'Morning walk',
  activity: 'light',
  minutes: 45,
  usualHour: 7,
  earliestHour: 6,
  latestHour: 17,
  required: false,
};
const school: Routine = {
  ...walk,
  id: 'school',
  label: 'School run',
  minutes: 20,
  latestHour: 7,
  required: true,
};
const nani: Member = {
  id: 'nani',
  name: 'Nani',
  group: 'elder',
  sensitive: false,
  routines: [walk],
};
const aarav: Member = {
  id: 'aarav',
  name: 'Aarav',
  group: 'child',
  sensitive: false,
  routines: [school],
};
const dad: Member = {
  id: 'dad',
  name: 'Rohan',
  group: 'adult',
  sensitive: false,
  routines: [walk],
};

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

describe('decide', () => {
  it.each([
    [90, true, false, 'go'],
    [150, true, false, 'shorten'],
    [150, false, false, 'go'],
    [250, false, false, 'shorten'],
    [350, true, false, 'indoors'],
    [350, true, true, 'mask'],
    [150, true, true, 'mask'],
  ] as const)('AQI %d vulnerable=%s required=%s → %s', (aqi, vulnerable, required, verdict) => {
    expect(decide(aqi, vulnerable, required)).toBe(verdict);
  });
});

describe('adviseRoutine', () => {
  it('moves an elder walk to the clean afternoon and counts the saving', () => {
    const advice = adviseRoutine(nani, walk, DAY);
    expect(advice).toMatchObject({ bestHour: 12, part: 'afternoon', verdict: 'shorten' });
    expect(advice?.savedDose).toBeGreaterThan(100);
  });
  it('keeps a required school run and advises a mask', () => {
    expect(adviseRoutine(aarav, school, DAY)).toMatchObject({ verdict: 'mask', bestHour: 7 });
  });
  it('lets a healthy adult walk in the afternoon', () => {
    expect(adviseRoutine(dad, walk, DAY)?.verdict).toBe('go');
  });
  it('sends vulnerable members indoors when every hour is bad', () => {
    const smog = DAY.map((h) => ({ ...h, pm25: 300 }));
    const advice = adviseRoutine(nani, walk, smog);
    expect(advice?.verdict).toBe('indoors');
    expect(advice?.adviceDose).toBeLessThan(advice?.usualDose ?? 0);
  });
  it('returns null when the forecast misses the window', () => {
    expect(adviseRoutine(nani, { ...walk, usualHour: 40 }, DAY)).toBeNull();
  });
});

describe('cleanestStart', () => {
  it('prefers the usual hour on a tie and skips uncovered hours', () => {
    const flat = DAY.map((h) => ({ ...h, pm25: 100 }));
    expect(cleanestStart(flat, { ...walk, latestHour: 30 }, 1)?.hour).toBe(7);
    expect(cleanestStart(flat, { ...walk, earliestHour: 30, latestHour: 31 }, 1)).toBeNull();
  });
});

describe('planDay', () => {
  it('advises every routine, ordered by best hour', () => {
    const plan = planDay([nani, aarav, dad], DAY);
    expect(plan.map((a) => a.memberId)).toEqual(['aarav', 'nani', 'dad']);
  });
});

describe('helpers', () => {
  it.each([
    [3, 'night'],
    [7, 'morning'],
    [13, 'afternoon'],
    [19, 'evening'],
    [23, 'night'],
    [31, 'morning'],
  ] as const)('hour %d is %s', (hour, part) => {
    expect(partOfDay(hour)).toBe(part);
  });
  it('treats children, elders and sensitive adults as vulnerable', () => {
    expect(isVulnerable(nani)).toBe(true);
    expect(isVulnerable(dad)).toBe(false);
    expect(isVulnerable({ ...dad, sensitive: true })).toBe(true);
  });
});
