import { describe, expect, it } from 'vitest';
import { pm25Index } from '../../src/engine/aqi';
import { at } from '../../src/engine/util';

describe('at', () => {
  it('returns the item at an index', () => {
    expect(at(['a', 'b'], 1)).toBe('b');
  });
  it('throws for an index out of range', () => {
    expect(() => at([1], 3)).toThrow(RangeError);
  });
});

describe('pm25Index', () => {
  it('gives the PM2.5 sub-index, or 0 for unusable values', () => {
    expect(pm25Index(60)).toBe(100);
    expect(pm25Index(-1)).toBe(0);
  });
});
