import { describe, expect, it } from 'vitest';
import { adviceLine, airLine, rulesExplain, totalSaved } from '../../src/engine/explain';
import { FACTS, facts } from '../fixtures/facts';

const ITEM = FACTS.items[0];
if (ITEM === undefined) throw new Error('fixture has no item');

describe('adviceLine', () => {
  it('explains a moved item with its saving', () => {
    expect(adviceLine(ITEM)).toBe(
      'Aai, Evening walk: move it from 6 pm to 2 pm and go ahead. Why: PM2.5 index drops from 192 to 115. Saves ~42 µg of PM2.5.',
    );
  });

  it('keeps an item already at its cleanest hour, with no saving line', () => {
    const line = adviceLine({ ...ITEM, usualHour: 14, verdict: 'mask', savedDose: 0 });
    expect(line).toBe(
      'Aai, Evening walk: keep 2 pm and go, but wear a well-fitted N95. Why: 2 pm is already the cleanest slot (index 115).',
    );
  });

  it('words the other verdicts', () => {
    expect(adviceLine({ ...ITEM, verdict: 'shorten' })).toContain('keep it to half the time');
    expect(adviceLine({ ...ITEM, verdict: 'indoors' })).toContain('do it indoors today');
  });
});

describe('totalSaved', () => {
  it('sums the saved dose', () => {
    expect(totalSaved(FACTS)).toBe(41.5);
    expect(totalSaved(facts({ items: [ITEM, ITEM] }))).toBe(83);
    expect(totalSaved(facts({ items: [] }))).toBe(0);
  });
});

describe('airLine', () => {
  it('names the CPCB station', () => {
    expect(airLine(FACTS)).toBe(
      'Air in Chembur, Mumbai: AQI 162 (Moderate), from CPCB station Borivali East, Mumbai - MPCB.',
    );
  });

  it('names the model when the source is not CPCB, or the station is missing', () => {
    expect(airLine(facts({ source: 'model', category: null }))).toBe(
      'Air in Chembur, Mumbai: AQI 162 (unknown), from the Open-Meteo model (no CPCB station within 25 km).',
    );
    expect(airLine(facts({ station: null }))).toContain('Open-Meteo model');
  });

  it('says so when there is no reading', () => {
    expect(airLine(facts({ aqi: null }))).toBe(
      'No live reading for Chembur, Mumbai right now.',
    );
  });
});

describe('rulesExplain', () => {
  it('lists the air, each item and the family total', () => {
    const lines = rulesExplain(FACTS).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('Together the family avoids ~42 µg of PM2.5 today.');
  });

  it('skips the total when nothing is saved', () => {
    expect(rulesExplain(facts({ items: [] }))).toBe(airLine(facts({ items: [] })));
  });
});
