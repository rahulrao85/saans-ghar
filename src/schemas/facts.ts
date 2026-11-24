import { z } from 'zod';

/** Longest forecast the client sends: today and tomorrow, hourly. */
const MAX_HOURS = 48;
/** More plan items than any real household has. */
const MAX_ITEMS = 40;
const MAX_TEXT = 120;
const MAX_AQI = 500;
const MAX_PM = 2000;
const MAX_HOUR = 47;

const text = z.string().trim().max(MAX_TEXT);
const hour = z.number().int().min(0).max(MAX_HOUR);

/** One routine's advice, as the AI and the rules see it. */
export const factItemSchema = z.object({
  member: text,
  group: z.enum(['child', 'adult', 'elder']),
  sensitive: z.boolean(),
  label: text,
  verdict: z.enum(['go', 'shorten', 'mask', 'indoors']),
  usualHour: hour,
  bestHour: hour,
  usualAqi: z.number().min(0).max(MAX_AQI),
  bestAqi: z.number().min(0).max(MAX_AQI),
  savedDose: z
    .number()
    .min(0)
    .max(MAX_PM * MAX_HOURS),
});

/**
 * Everything code has worked out about today. The AI may only word these
 * facts; the number guard rejects any figure that is not in them.
 */
export const planFactsSchema = z.object({
  place: text,
  source: z.enum(['cpcb', 'model']),
  station: text.nullable(),
  updated: text.nullable(),
  aqi: z.number().min(0).max(MAX_AQI).nullable(),
  category: text.nullable(),
  pm25: z.number().min(0).max(MAX_PM).nullable(),
  forecast: z.array(z.object({ hour, pm25: z.number().min(0).max(MAX_PM) })).max(MAX_HOURS),
  items: z.array(factItemSchema).max(MAX_ITEMS),
});

export type FactItem = z.infer<typeof factItemSchema>;
export type PlanFacts = z.infer<typeof planFactsSchema>;

/** Languages the explanation and notice can be written in. */
export const languageSchema = z.enum(['en', 'hi', 'mr']);
export type Language = z.infer<typeof languageSchema>;

/** What the AI read off a photo of an air monitor or purifier display. */
export const displayReadingSchema = z.object({
  found: z.boolean(),
  pm25: z.number().min(0).max(MAX_PM).nullable(),
  device: z.enum(['monitor', 'purifier', 'other']),
});
export type DisplayReading = z.infer<typeof displayReadingSchema>;

/** Every AI-backed answer says where it came from. */
export interface AiText {
  readonly text: string;
  readonly source: 'gemini' | 'rules';
}
