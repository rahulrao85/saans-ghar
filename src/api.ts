import { z } from 'zod';
import { airReportSchema, placesSchema, type AirReportData, type PlacesData } from './schemas/air';
import {
  displayReadingSchema,
  type AiText,
  type DisplayReading,
  type Language,
  type PlanFacts,
} from './schemas/facts';
import type { LatLon } from './engine/geoTypes';

/** A readable message from anything thrown. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

const aiTextSchema = z.object({ text: z.string(), source: z.enum(['gemini', 'rules']) });
const errorSchema = z.object({ error: z.string() });

/** Paths are relative so the app works under any prefix (/saans/ or a subdomain root). */
async function call<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        };
  const response = await fetch(path, init);
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = errorSchema.safeParse(json);
    throw new Error(
      message.success ? message.data.error : 'The server is not answering. Try again.',
    );
  }
  return schema.parse(json);
}

/** Live air report for a point in India. */
export const getAir = (p: LatLon): Promise<AirReportData> =>
  call(`api/air?lat=${p.lat}&lon=${p.lon}`, airReportSchema);

/** CPCB stations and places matching a search. */
export const findPlaces = (q: string): Promise<PlacesData> =>
  call(`api/places?q=${encodeURIComponent(q)}`, placesSchema);

/** The plan explained in `language` (Gemini, or the rules text). */
export const explain = (facts: PlanFacts, language: Language): Promise<AiText> =>
  call('api/ai/explain', aiTextSchema, { facts, language });

/** Ask a question about the plan; the answer comes back in `language`. */
export const ask = (facts: PlanFacts, question: string, language: Language): Promise<AiText> =>
  call('api/ai/ask', aiTextSchema, { facts, question, language });

/** What the notice route needs; the go/no-go call is made on the server by code. */
export interface NoticeRequest {
  readonly place: string;
  readonly aqi: number;
  readonly delhiNcr: boolean;
  readonly cleanestHour: number | null;
  readonly language: Language;
}

/** A society or school notice; the go/no-go call is made by code on the server. */
export const notice = (request: NoticeRequest): Promise<AiText> =>
  call('api/ai/notice', aiTextSchema, request);

/** The PM2.5 number Gemini reads off a monitor or purifier photo. */
export const readPhoto = (image: string, mimeType: string): Promise<DisplayReading> =>
  call('api/ai/read', displayReadingSchema, { image, mimeType });
