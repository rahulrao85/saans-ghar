import { describe, expect, it } from 'vitest';
import type { HourlyPm } from '../../src/engine/forecast';
import type { Member, Routine } from '../../src/engine/household';
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

describe('partOfDay', () => {
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
});
