import { describe, expect, it } from 'vitest';
import { fetchStations, groupStations, toIsoIst, toReading } from '../../server/sources/cpcb';
import { BORIVALI, page, row, type Row } from './fixtures';

describe('toIsoIst', () => {
  it('converts DD-MM-YYYY HH:MM:SS to ISO with the IST offset', () => {
    expect(toIsoIst('23-11-2026 17:00:00')).toBe('2026-11-23T17:00:00+05:30');
    expect(toIsoIst(' 01-02-2026 00:05:09 ')).toBe('2026-02-01T00:05:09+05:30');
  });
  it('returns null for malformed input', () => {
    expect(toIsoIst('2026-11-23 17:00')).toBeNull();
    expect(toIsoIst('')).toBeNull();
  });
});

const typed = (over: Partial<Row> = {}): Parameters<typeof toReading>[0] => ({
  ...row(over),
  latitude: 19.2321,
  longitude: 72.8645,
});

describe('toReading', () => {
  it('turns a sub-index into a concentration', () => {
    const r = toReading(typed({ avg_value: '50' }));
    expect(r).toEqual({ pollutant: 'PM2.5', value: 30 });
  });
  it('skips unknown pollutants, blanks, NA and negatives', () => {
    expect(toReading(typed({ pollutant_id: 'BENZENE' }))).toBeNull();
    expect(toReading(typed({ avg_value: '' }))).toBeNull();
    expect(toReading(typed({ avg_value: '  ' }))).toBeNull();
    expect(toReading(typed({ avg_value: 'NA' }))).toBeNull();
    expect(toReading(typed({ avg_value: '-5' }))).toBeNull();
  });
});

describe('groupStations', () => {
  it('groups rows per station and skips invalid ones', () => {
    const stations = groupStations([
      row(),
      row({ pollutant_id: 'PM10', avg_value: '120' }),
      row({ pollutant_id: 'NO2', avg_value: 'NA' }),
      row({ last_update: 'yesterday' }),
      { nonsense: true },
      row({ station: 'Bandra, Mumbai - MPCB', latitude: '19.06', longitude: '72.83' }),
    ]);
    expect(stations).toHaveLength(2);
    const [first, second] = stations;
    expect(first?.id).toBe('borivali-east-mumbai-mpcb');
    expect(first?.name).toBe(BORIVALI);
    expect(first?.city).toBe('Mumbai');
    expect(first?.state).toBe('Maharashtra');
    expect(first?.lat).toBeCloseTo(19.2321);
    expect(first?.lon).toBeCloseTo(72.8645);
    expect(first?.updated).toBe('2026-11-23T23:00:00+05:30');
    expect(first?.readings.map((r) => r.pollutant)).toEqual(['PM2.5', 'PM10']);
    expect(second?.readings).toHaveLength(1);
  });
});

describe('fetchStations', () => {
  const PAGE = 1000;
  const filler = (n: number): unknown[] => Array.from({ length: n }, () => ({}));

  it('stops once every row has been read', async () => {
    const urls: string[] = [];
    const stations = await fetchStations((url) => {
      urls.push(url);
      return Promise.resolve(page([row()]));
    }, 'a key&1');
    expect(stations).toHaveLength(1);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('api-key=a%20key%261');
    expect(urls[0]).toContain('limit=1000&offset=0');
  });

  it('stops on a short page even when total is larger', async () => {
    let calls = 0;
    await fetchStations(() => {
      calls++;
      return Promise.resolve(page([row()], 5000));
    }, 'k');
    expect(calls).toBe(1);
  });

  it('keeps paging while pages are full and total is not reached', async () => {
    const urls: string[] = [];
    const stations = await fetchStations((url) => {
      urls.push(url);
      return Promise.resolve(
        page(urls.length === 2 ? [row(), ...filler(PAGE - 1)] : filler(PAGE), 2000),
      );
    }, 'k');
    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain('offset=1000');
    expect(stations).toHaveLength(1);
  });

  it('never reads more than eight pages', async () => {
    let calls = 0;
    await fetchStations(() => {
      calls++;
      return Promise.resolve(page(filler(PAGE), 99_999));
    }, 'k');
    expect(calls).toBe(8);
  });

  it('rejects a malformed page', async () => {
    await expect(fetchStations(() => Promise.resolve({ nope: 1 }), 'k')).rejects.toThrow();
  });
});
