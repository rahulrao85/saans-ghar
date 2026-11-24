import { describe, expect, it } from 'vitest';
import { record, weekTotals } from '../../src/engine/ledger';

describe('ledger', () => {
  it('replaces a same-day entry and totals the last 7 days per member', () => {
    let entries = record([], { date: '2026-11-23', memberId: 'nani', saved: 40.2 });
    entries = record(entries, { date: '2026-11-23', memberId: 'nani', saved: 55.1 });
    entries = record(entries, { date: '2026-11-18', memberId: 'nani', saved: 10 });
    entries = record(entries, { date: '2026-11-16', memberId: 'nani', saved: 99 });
    entries = record(entries, { date: '2026-11-24', memberId: 'nani', saved: 99 });
    entries = record(entries, { date: '2026-11-20', memberId: 'aarav', saved: 7.25 });
    expect(entries).toHaveLength(5);
    expect(weekTotals(entries, '2026-11-23')).toEqual({ nani: 65.1, aarav: 7.3 });
  });
});
