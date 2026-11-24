import type { Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { noticeFacts } from '../src/engine/notice';
import { languageSchema, planFactsSchema } from '../src/schemas/facts';
import type { AiModel } from './ai/model';
import { askPlan, explainPlan, readDisplay, writeNotice } from './ai/tasks';
import { rateLimit } from './http';
import { log } from './log';
import { STATUS } from './status';

/** Plan facts are a few KB; 32 KB leaves room without inviting abuse. */
const JSON_LIMIT_BYTES = 32_768;
/** The client shrinks photos to ~800 px JPEG (~150 KB) before sending; base64 adds a third. */
const PHOTO_LIMIT_BYTES = 1_048_576;
/** Free Gemini tier: keep each visitor well inside the shared per-minute quota. */
const AI_RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;
const QUESTION_MAX = 300;
const PLACE_MAX = 120;
const MAX_HOUR = 47;
const MAX_AQI = 500;

const explainBody = z.object({ facts: planFactsSchema, language: languageSchema });
const askBody = z.object({
  facts: planFactsSchema,
  language: languageSchema.default('en'),
  question: z.string().trim().min(1).max(QUESTION_MAX),
});
const noticeBody = z.object({
  place: z.string().trim().min(1).max(PLACE_MAX),
  aqi: z.number().int().min(0).max(MAX_AQI),
  delhiNcr: z.boolean(),
  cleanestHour: z.number().int().min(0).max(MAX_HOUR).nullable(),
  language: languageSchema,
});
const photoBody = z.object({
  image: z.string().regex(/^[A-Za-z0-9+/=]+$/),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const limit = (maxSize: number) =>
  bodyLimit({ maxSize, onError: (c) => c.json({ error: 'Request too large.' }, STATUS.tooLarge) });

async function jsonBody(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  return c.req.json().catch(() => null);
}

const BAD = { error: 'That request did not look right. Please reload and try again.' };

/** Photo reading has no rules fallback: without the AI the user types the number. */
async function readRoute(c: Context, model: AiModel | null): Promise<Response> {
  if (model === null) {
    return c.json(
      { error: 'Photo reading needs the AI. Type the number instead.' },
      STATUS.unavailable,
    );
  }
  const parsed = photoBody.safeParse(await jsonBody(c));
  if (!parsed.success) return c.json(BAD, STATUS.badRequest);
  try {
    return c.json(await readDisplay(model, parsed.data.image, parsed.data.mimeType));
  } catch (error) {
    log('warn', 'photo read failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return c.json(
      { error: 'Could not read that photo. Type the number instead.' },
      STATUS.badGateway,
    );
  }
}

/** AI routes. With no key (model null) every text route still answers, from the rules. */
export function registerAi(app: Hono, model: AiModel | null): void {
  app.use('/api/ai/*', rateLimit(AI_RATE_LIMIT, RATE_WINDOW_MS));
  app.post('/api/ai/explain', limit(JSON_LIMIT_BYTES), async (c) => {
    const b = explainBody.safeParse(await jsonBody(c));
    if (!b.success) return c.json(BAD, STATUS.badRequest);
    return c.json(await explainPlan(model, b.data.facts, b.data.language));
  });
  app.post('/api/ai/ask', limit(JSON_LIMIT_BYTES), async (c) => {
    const b = askBody.safeParse(await jsonBody(c));
    if (!b.success) return c.json(BAD, STATUS.badRequest);
    return c.json(await askPlan(model, b.data.question, b.data.facts, b.data.language));
  });
  app.post('/api/ai/notice', limit(JSON_LIMIT_BYTES), async (c) => {
    const b = noticeBody.safeParse(await jsonBody(c));
    if (!b.success) return c.json(BAD, STATUS.badRequest);
    const facts = noticeFacts(b.data.place, b.data.aqi, b.data.delhiNcr, b.data.cleanestHour);
    return c.json({ ...(await writeNotice(model, facts, b.data.language)), facts });
  });
  app.post('/api/ai/read', limit(PHOTO_LIMIT_BYTES), (c) => readRoute(c, model));
}
