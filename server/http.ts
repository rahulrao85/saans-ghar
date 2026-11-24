import type { Context, MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { STATUS } from './status';

const MS_PER_SECOND = 1000;

/** Strict CSP: only our own scripts, styles and API; nothing inline. */
export const securityHeaders: MiddlewareHandler = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'blob:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  },
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xFrameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: { camera: ['self'], geolocation: ['self'], microphone: [] },
});

/**
 * Client address. In production the app sits behind Caddy, which sets
 * X-Forwarded-For itself; the last entry is the one the nearest proxy added,
 * so a client cannot spoof its way past the rate limit by sending its own.
 */
export function clientIp(c: Context): string {
  const hops = c.req.header('x-forwarded-for')?.split(',') ?? [];
  const last = hops[hops.length - 1]?.trim();
  return last !== undefined && last !== '' ? last : 'local';
}

interface RateWindow {
  count: number;
  start: number;
}

/** Drop windows that have ended, so the map cannot grow without bound. */
function prune(hits: Map<string, RateWindow>, t: number, windowMs: number): void {
  for (const [ip, w] of hits) if (t - w.start >= windowMs) hits.delete(ip);
}

/**
 * Fixed-window rate limit per client address.
 * @param limit requests allowed per window
 */
export function rateLimit(limit: number, windowMs: number, now = Date.now): MiddlewareHandler {
  const hits = new Map<string, RateWindow>();
  let lastPrune = now();
  return async (c, next) => {
    const t = now();
    if (t - lastPrune >= windowMs) {
      prune(hits, t, windowMs);
      lastPrune = t;
    }
    const ip = clientIp(c);
    const entry = hits.get(ip);
    const current =
      entry === undefined || t - entry.start >= windowMs ? { count: 0, start: t } : entry;
    current.count++;
    hits.set(ip, current);
    if (current.count > limit) {
      c.header('Retry-After', String(Math.ceil((current.start + windowMs - t) / MS_PER_SECOND)));
      return c.json({ error: 'Too many requests. Please wait a minute.' }, STATUS.tooMany);
    }
    await next();
    return undefined;
  };
}

/** Host part of an Origin header; null for "null" or anything malformed. */
function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

/** Reject cross-site writes: the Origin host must match the Host header. */
export const sameOrigin: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const origin = c.req.header('origin');
    const host = c.req.header('host');
    if (origin === undefined || host === undefined || hostOf(origin) !== host) {
      return c.json({ error: 'Cross-site request blocked.' }, STATUS.forbidden);
    }
  }
  await next();
  return undefined;
};
