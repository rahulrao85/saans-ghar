import { describe, expect, it } from 'vitest';
import { DEMOS } from '../../src/state/demo';
import { addToLedger, derive } from '../../src/state/derive';
import { EMPTY_HOUSEHOLD } from '../../src/state/household';
import { IST_LATE, IST_MIDNIGHT, airReport } from '../fixtures/air';
import { household } from '../fixtures/ui';

const at = (iso: string): number => Date.parse(iso);
const mumbai = DEMOS[0]!.household;

describe('derive', () => {
  it('has no plan without a report', () => {
    const d = derive(household(), null, at(IST_MIDNIGHT));
    expect(d).toEqual({ nowHour: 0, advice: [], facts: null });
  });

  it('has no plan without a place', () => {
    const d = derive(EMPTY_HOUSEHOLD, airReport(), at(IST_MIDNIGHT));
    expect(d.facts).toBeNull();
    expect(d.advice).toEqual([]);
  });

  it('plans routines and builds the facts', () => {
    const d = derive(household(), airReport(), at(IST_MIDNIGHT));
    expect(d.nowHour).toBe(0);
    expect(d.advice).toHaveLength(1);
    expect(d.advice[0]?.bestHour).toBe(14);
    expect(d.facts?.place).toBe('Chembur, Mumbai');
    expect(d.facts?.items).toHaveLength(1);
  });

  it('moves a passed routine to tomorrow', () => {
    const h = household();
    const [aaji] = h.members;
    const closed = { ...aaji!, routines: [{ ...aaji!.routines[0]!, latestHour: 20 }] };
    const d = derive({ ...h, members: [closed] }, airReport(), at(IST_LATE));
    expect(d.nowHour).toBe(22);
    expect(d.advice[0]?.bestHour).toBeGreaterThanOrEqual(24);
  });

  it('plans every demo household', () => {
    for (const demo of DEMOS) {
      const d = derive(demo.household, airReport(), at(IST_MIDNIGHT));
      expect(d.advice.length).toBeGreaterThan(0);
    }
  });
});

describe('addToLedger', () => {
  it('sums a member per day and overwrites the same day', () => {
    const advice = derive(mumbai, airReport(), at(IST_MIDNIGHT)).advice;
    const once = addToLedger([], advice, at(IST_MIDNIGHT));
    expect(once.every((e) => e.date === '2026-11-24')).toBe(true);
    const ids = new Set(advice.map((a) => a.memberId));
    expect(once).toHaveLength(ids.size);
    const twice = addToLedger(once, advice, at(IST_MIDNIGHT));
    expect(twice).toHaveLength(once.length);
    const tara = once.find((e) => e.memberId === 'tara');
    const expected = advice
      .filter((a) => a.memberId === 'tara')
      .reduce((s, a) => s + a.savedDose, 0);
    expect(tara?.saved).toBeCloseTo(expected);
  });

  it('keeps other days', () => {
    const old = [{ date: '2026-11-20', memberId: 'aaji', saved: 5 }];
    expect(addToLedger(old, [], at(IST_MIDNIGHT))).toEqual(old);
  });
});
