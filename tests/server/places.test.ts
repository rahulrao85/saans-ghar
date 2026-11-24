import { describe, expect, it } from 'vitest';
import { findPlaces, matchStations } from '../../server/places';
import { groupStations } from '../../server/sources/cpcb';
import { BORIVALI, fakeFetch, row } from './fixtures';

const stations = groupStations([
  row(),
  row({ station: 'Bandra, Mumbai - MPCB', latitude: '19.06', longitude: '72.83' }),
  row({ station: 'Anand Vihar, Delhi - DPCC', city: 'Delhi', state: 'Delhi' }),
]);

describe('matchStations', () => {
  it('matches by name or city, case-insensitively', () => {
    expect(matchStations('BORIVALI', stations).map((s) => s.label)).toEqual([BORIVALI]);
    expect(matchStations('delhi', stations)).toHaveLength(1);
    expect(matchStations('mumbai', stations)).toHaveLength(2);
  });
  it('returns label, city and coordinates', () => {
    expect(matchStations('anand', stations)).toEqual([
      { label: 'Anand Vihar, Delhi - DPCC', city: 'Delhi', lat: 19.2321, lon: 72.8645 },
    ]);
  });
  it('caps at eight matches', () => {
    const many = groupStations(
      Array.from({ length: 12 }, (_, i) => row({ station: `Stn ${i}, Mumbai` })),
    );
    expect(matchStations('stn', many)).toHaveLength(8);
  });
});

describe('findPlaces', () => {
  it('returns stations and geocoded places', async () => {
    const { fetchJson } = fakeFetch({
      geocode: () => ({ results: [{ name: 'Chembur', latitude: 19.2, longitude: 72.85 }] }),
    });
    const out = await findPlaces('borivali', stations, fetchJson);
    expect(out.stations).toHaveLength(1);
    expect(out.places).toEqual([{ label: 'Chembur', lat: 19.2, lon: 72.85 }]);
  });
  it('still returns stations when the place search fails', async () => {
    const { fetchJson } = fakeFetch({
      geocode: () => {
        throw new Error('down');
      },
    });
    const out = await findPlaces('borivali', stations, fetchJson);
    expect(out.stations).toHaveLength(1);
    expect(out.places).toEqual([]);
  });
});
