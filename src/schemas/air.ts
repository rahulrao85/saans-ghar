import { z } from 'zod';

const pollutant = z.enum(['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'OZONE', 'NH3']);
const category = z.enum(['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe']);

/** The /api/air response, checked on arrival so the UI never renders bad data. */
export const airReportSchema = z.object({
  source: z.enum(['cpcb', 'model']),
  station: z
    .object({
      name: z.string(),
      city: z.string(),
      state: z.string(),
      updated: z.string(),
      km: z.number(),
    })
    .nullable(),
  aqi: z
    .object({
      aqi: z.number(),
      band: z.object({
        category,
        low: z.number(),
        high: z.number(),
        colour: z.string(),
        health: z.string(),
      }),
      dominant: pollutant,
      subIndices: z.partialRecord(pollutant, z.number()),
      complete: z.boolean(),
    })
    .nullable(),
  pm25: z.number().nullable(),
  forecast: z.array(z.object({ hour: z.number(), pm25: z.number() })),
  weather: z.array(z.object({ hour: z.number(), mixingHeightM: z.number(), windKmh: z.number() })),
  stale: z.boolean(),
});
export type AirReportData = z.infer<typeof airReportSchema>;

/** The /api/places response. */
export const placesSchema = z.object({
  stations: z.array(
    z.object({ label: z.string(), city: z.string(), lat: z.number(), lon: z.number() }),
  ),
  places: z.array(z.object({ label: z.string(), lat: z.number(), lon: z.number() })),
});
export type PlacesData = z.infer<typeof placesSchema>;
