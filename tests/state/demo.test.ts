import { describe, expect, it } from 'vitest';
import { DEMOS } from '../../src/state/demo';
import { householdSchema } from '../../src/state/household';

describe('demo households', () => {
  it('offers Mumbai and Delhi families that pass the schema', () => {
    expect(DEMOS.map((d) => d.title)).toEqual(['Mumbai family', 'Delhi family']);
    for (const d of DEMOS) expect(householdSchema.safeParse(d.household).success).toBe(true);
  });

  it('keeps every usual hour inside its window', () => {
    for (const d of DEMOS) {
      for (const r of d.household.members.flatMap((m) => m.routines)) {
        expect(r.earliestHour).toBeGreaterThanOrEqual(0);
        expect(r.latestHour).toBeLessThanOrEqual(23);
        expect(r.earliestHour).toBeLessThanOrEqual(r.usualHour);
        expect(r.latestHour).toBeGreaterThanOrEqual(r.usualHour);
      }
    }
  });

  it('clamps windows to the day', () => {
    const dadaji = DEMOS[1]?.household.members[0]?.routines[0];
    expect(dadaji).toMatchObject({ earliestHour: 0, latestHour: 12 });
    const aaji = DEMOS[0]?.household.members[0]?.routines[0];
    expect(aaji).toMatchObject({ earliestHour: 14, latestHour: 22 });
  });
});
