import { Hono } from 'hono';
import { except } from 'hono/combine';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AiModel } from './ai/model';
import type { AirService } from './air';
import { registerAi } from './aiRoutes';
import { inIndia } from './geo';
import { rateLimit, sameOrigin, securityHeaders } from './http';
import { log } from './log';
import { findPlaces } from './places';
import { STATUS } from './status';
import type { FetchJson } from './sources/cpcb';

/** What the HTTP layer needs. */
export interface AppDeps {
  readonly air: AirService;
  readonly fetchJson: FetchJson;
  /** Null when no Gemini key is set: every AI route then answers from the rules. */
  readonly ai: AiModel | null;
}

/** 8 KB: every JSON request is small. */
const BODY_LIMIT_BYTES = 8_192;
const LAT_MAX = 90;
const LON_MAX = 180;
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const QUERY_MAX = 60;
const QUERY_MIN = 2;
/** Station data refreshes every 30 min upstream; a browser may reuse a lookup for 5. */
const CACHE_LOOKUPS = 'private, max-age=300';

const pointQuery = z.object({
  lat: z.coerce.number().min(-LAT_MAX).max(LAT_MAX),
  lon: z.coerce.number().min(-LON_MAX).max(LON_MAX),
});
const placeQuery = z.object({ q: z.string().trim().min(QUERY_MIN).max(QUERY_MAX) });

/** The API, mounted under /api. Static files are added by main.ts. */
export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  app.use('*', securityHeaders);
  app.use('/api/*', rateLimit(RATE_LIMIT, RATE_WINDOW_MS), sameOrigin);
  const smallBodies = bodyLimit({
    maxSize: BODY_LIMIT_BYTES,
    onError: (c) => c.json({ error: 'Request too large.' }, STATUS.tooLarge),
  });
  // AI routes set their own, larger limits (plan facts, photos).
  app.use('/api/*', except('/api/ai/*', smallBodies));
  registerAi(app, deps.ai);

  app.get('/api/health', async (c) => {
    const { list, stale } = await deps.air.allStations();
    return c.json({ ok: true, stations: list.length, stale, ai: deps.ai !== null });
  });

  app.get('/api/places', async (c) => {
    const parsed = placeQuery.safeParse(c.req.query());
    if (!parsed.success)
      return c.json({ error: 'Type at least 2 letters of a place.' }, STATUS.badRequest);
    const { list } = await deps.air.allStations();
    c.header('Cache-Control', CACHE_LOOKUPS);
    return c.json(await findPlaces(parsed.data.q, list, deps.fetchJson));
  });

  app.get('/api/air', async (c) => {
    const parsed = pointQuery.safeParse(c.req.query());
    if (!parsed.success || !inIndia(parsed.data)) {
      return c.json({ error: 'Choose a place in India.' }, STATUS.badRequest);
    }
    c.header('Cache-Control', CACHE_LOOKUPS);
    return c.json(await deps.air.report(parsed.data));
  });

  app.onError((error, c) => {
    log('error', 'unhandled', { path: c.req.path, message: error.message });
    return c.json({ error: 'Something went wrong. Please try again.' }, STATUS.serverError);
  });
  return app;
}
