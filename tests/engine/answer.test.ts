import { describe, expect, it } from 'vitest';
import { rulesAnswer } from '../../src/engine/answer';
import { FACTS, facts } from '../fixtures/facts';

describe('rulesAnswer', () => {
  it('answers about a member by name', () => {
    const out = rulesAnswer('What about Aai?', FACTS);
    expect(out).toContain('Aai, Evening walk');
  });

  it('answers about the best time from the cleanest forecast hour', () => {
    expect(rulesAnswer('When is the best time?', FACTS)).toBe(
      'The cleanest hour in the forecast is 2 pm (PM2.5 ~52 µg/m³). Plan walks and airing the house around then.',
    );
  });

  it('skips the best-time rule when the forecast is empty', () => {
    const out = rulesAnswer('best time to use a mask?', facts({ forecast: [] }));
    expect(out).toContain('N95 that seals');
  });

  it('answers about masks', () => {
    expect(rulesAnswer('Is a N95 ok?', FACTS)).toContain('Masks help only when well fitted');
  });

  it('answers about the saving', () => {
    expect(rulesAnswer('How much dose do we save?', FACTS)).toBe(
      "Following today's plan, the family avoids ~42 µg of PM2.5. Dose = PM2.5 × breathing rate (by age and activity) × minutes.",
    );
  });

  it('falls back to the air headline and a hint', () => {
    const out = rulesAnswer('hello', FACTS);
    expect(out).toContain('Air in Chembur, Mumbai: AQI 162');
    expect(out).toContain('Ask about a family member by name');
    expect(rulesAnswer('hello', facts({ aqi: null }))).toContain('No live reading');
  });

  it('answers the saving rule when no earlier rule matches and the model source is used', () => {
    const out = rulesAnswer('ug?', facts({ source: 'model', station: null }));
    expect(out).toContain('the family avoids');
  });
});
