import { describe, expect, it } from 'vitest';
import { distanceKm, inIndia, nearest } from '../../server/geo';

const borivali = { lat: 19.2321, lon: 72.8645 };
const bandra = { lat: 19.06, lon: 72.83 };

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(borivali, borivali)).toBe(0);
  });
  it('measures Borivali to Bandra at about 19 km, rounded to 0.1', () => {
    const km = distanceKm(borivali, bandra);
    expect(km).toBeGreaterThan(18);
    expect(km).toBeLessThan(20);
    expect(km * 10).toBeCloseTo(Math.round(km * 10), 6);
  });
});

describe('nearest', () => {
  const bandraItem = { ...bandra, id: 'bandra' };
  const chembur = { lat: 19.2, lon: 72.86, id: 'chembur' };
  const delhi = { lat: 28.6, lon: 77.2, id: 'delhi' };

  it('picks the closest item within range', () => {
    expect(nearest([bandraItem, chembur, delhi], borivali, 25)?.item.id).toBe('chembur');
  });
  it('keeps the first when a later item is farther', () => {
    expect(nearest([chembur, bandraItem], borivali, 25)?.item.id).toBe('chembur');
  });
  it('returns null when nothing is in range or the list is empty', () => {
    expect(nearest([bandraItem, chembur, delhi], { lat: 12, lon: 80 }, 25)).toBeNull();
    expect(nearest([], borivali, 25)).toBeNull();
  });
});

describe('inIndia', () => {
  it('accepts points inside and on the edges of the box', () => {
    expect(inIndia(borivali)).toBe(true);
    expect(inIndia({ lat: 6, lon: 68 })).toBe(true);
    expect(inIndia({ lat: 37.5, lon: 97.5 })).toBe(true);
  });
  it('rejects points beyond each edge', () => {
    expect(inIndia({ lat: 5.9, lon: 80 })).toBe(false);
    expect(inIndia({ lat: 37.6, lon: 80 })).toBe(false);
    expect(inIndia({ lat: 20, lon: 67.9 })).toBe(false);
    expect(inIndia({ lat: 20, lon: 97.6 })).toBe(false);
  });
});
