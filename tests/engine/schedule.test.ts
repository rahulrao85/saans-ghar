import { describe, expect, it } from 'vitest';
import type { Member, Routine } from '../../src/engine/household';
import { lookAhead, upcoming } from '../../src/engine/schedule';

const walk: Routine = {
  id: 'walk',
  label: 'Walk',
  activity: 'light',
  minutes: 30,
  usualHour: 7,
  earliestHour: 6,
  latestHour: 9,
  required: false,
};

describe('upcoming', () => {
  it('starts no earlier than now while the window is open', () => {
    expect(upcoming(walk, 8)).toEqual({ ...walk, earliestHour: 8 });
    expect(upcoming(walk, 9).earliestHour).toBe(9);
  });

  it('keeps the earliest hour when it is still ahead', () => {
    expect(upcoming(walk, 3)).toEqual(walk);
  });

  it('moves a passed window to tomorrow', () => {
    expect(upcoming(walk, 10)).toEqual({
      ...walk,
      usualHour: 31,
      earliestHour: 30,
      latestHour: 33,
    });
  });
});

describe('lookAhead', () => {
  it('moves every routine of every member', () => {
    const member: Member = {
      id: 'a',
      name: 'Aai',
      group: 'elder',
      sensitive: false,
      routines: [walk],
    };
    const [out] = lookAhead([member], 10);
    expect(out?.routines[0]?.usualHour).toBe(31);
    expect(out?.name).toBe('Aai');
    expect(lookAhead([], 10)).toEqual([]);
  });
});
