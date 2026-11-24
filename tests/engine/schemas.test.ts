import { describe, expect, it } from 'vitest';
import { airReportSchema, placesSchema } from '../../src/schemas/air';
import {
  displayReadingSchema,
  factItemSchema,
  languageSchema,
  planFactsSchema,
} from '../../src/schemas/facts';
import { FACTS } from '../fixtures/facts';

describe('facts schemas', () => {
  it('accepts valid plan facts and trims text', () => {
    expect(planFactsSchema.parse(FACTS)).toEqual(FACTS);
    expect(planFactsSchema.parse({ ...FACTS, place: '  Thane  ' }).place).toBe('Thane');
  });

  it('rejects invalid plan facts', () => {
    expect(planFactsSchema.safeParse({ ...FACTS, aqi: 900 }).success).toBe(false);
    expect(planFactsSchema.safeParse({ ...FACTS, source: 'x' }).success).toBe(false);
    expect(planFactsSchema.safeParse({}).success).toBe(false);
    expect(factItemSchema.safeParse({ ...FACTS.items[0], usualHour: 48 }).success).toBe(false);
  });

  it('checks languages and display readings', () => {
    expect(languageSchema.safeParse('mr').success).toBe(true);
    expect(languageSchema.safeParse('fr').success).toBe(false);
    expect(
      displayReadingSchema.safeParse({ found: true, pm25: 40, device: 'monitor' }).success,
    ).toBe(true);
    expect(
      displayReadingSchema.safeParse({ found: true, pm25: -1, device: 'monitor' }).success,
    ).toBe(false);
  });
});

describe('air schemas', () => {
  const report = {
    source: 'model',
    station: null,
    aqi: null,
    pm25: null,
    forecast: [{ hour: 1, pm25: 20 }],
    weather: [{ hour: 1, mixingHeightM: 500, windKmh: 4 }],
    stale: false,
  };

  it('parses a valid report and rejects an invalid one', () => {
    expect(airReportSchema.parse(report)).toEqual(report);
    expect(airReportSchema.safeParse({ ...report, source: 'other' }).success).toBe(false);
    expect(airReportSchema.safeParse({ ...report, forecast: [{ hour: 'x' }] }).success).toBe(false);
  });

  it('parses places', () => {
    const places = {
      stations: [{ label: 'A', city: 'B', lat: 1, lon: 2 }],
      places: [{ label: 'C', lat: 3, lon: 4 }],
    };
    expect(placesSchema.parse(places)).toEqual(places);
    expect(placesSchema.safeParse({ stations: [] }).success).toBe(false);
  });
});
