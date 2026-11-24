// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_HOUSEHOLD,
  loadHousehold,
  loadLedger,
  newId,
  saveHousehold,
  saveLedger,
} from '../../src/state/household';
import { household } from '../fixtures/ui';

const KEY = 'saans-ghar:household';

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('household storage', () => {
  it('returns the empty household when nothing is stored', () => {
    expect(loadHousehold()).toBe(EMPTY_HOUSEHOLD);
  });

  it('round-trips a household', () => {
    saveHousehold(household());
    expect(loadHousehold()).toEqual(household());
  });

  it('falls back on invalid JSON', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadHousehold()).toBe(EMPTY_HOUSEHOLD);
  });

  it('falls back on a schema mismatch', () => {
    localStorage.setItem(KEY, JSON.stringify({ place: 5, members: [] }));
    expect(loadHousehold()).toBe(EMPTY_HOUSEHOLD);
  });

  it('falls back when getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadHousehold()).toBe(EMPTY_HOUSEHOLD);
  });

  it('swallows a setItem that throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => {
      saveHousehold(household());
    }).not.toThrow();
  });
});

describe('ledger storage', () => {
  it('round-trips entries and defaults to empty', () => {
    expect(loadLedger()).toEqual([]);
    const entries = [{ date: '2026-11-24', memberId: 'aaji', saved: 12.5 }];
    saveLedger(entries);
    expect(loadLedger()).toEqual(entries);
  });

  it('ignores a malformed ledger', () => {
    localStorage.setItem('saans-ghar:ledger', JSON.stringify([{ date: 1 }]));
    expect(loadLedger()).toEqual([]);
  });
});

describe('newId', () => {
  it('is eight characters and differs between calls', () => {
    const a = newId();
    expect(a).toHaveLength(8);
    expect(newId()).not.toBe(a);
  });
});
