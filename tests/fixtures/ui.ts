import { vi, type Mock } from 'vitest';
import type { AirReportData } from '../../src/schemas/air';
import type { PlanFacts } from '../../src/schemas/facts';
import type { Household } from '../../src/state/household';
import { airReport } from './air';

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export type Handler = (init: RequestInit | undefined, url: string) => Response | Promise<Response>;

/**
 * Stub global fetch with handlers keyed by the start of the request path
 * ("api/air", "api/ai/ask"). Anything unrouted rejects like a dead network.
 */
export function stubFetch(routes: Readonly<Record<string, Handler>>): Mock<typeof fetch> {
  const fake = vi.fn<typeof fetch>((input, init) => {
    const url = urlOf(input);
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    const handler = key === undefined ? undefined : routes[key];
    if (handler === undefined) return Promise.reject(new Error(`no route for ${url}`));
    return Promise.resolve(handler(init, url));
  });
  vi.stubGlobal('fetch', fake);
  return fake;
}

/** The standard air route for App tests. */
export const airRoute = (report: AirReportData = airReport()): Record<string, Handler> => ({
  'api/air': () => json(report),
});

/** Parsed JSON body of the first call to a stubbed fetch whose URL starts with `path`. */
export function bodyOf(fake: Mock<typeof fetch>, path: string): unknown {
  const call = fake.mock.calls.find(([input]) => urlOf(input).startsWith(path));
  return parseBody(call?.[1]);
}

/** Parsed JSON body of a request, or undefined when it has none. */
export function parseBody(init: RequestInit | undefined): unknown {
  const body = init?.body;
  return typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export const MUMBAI_PLACE = { label: 'Chembur, Mumbai', lat: 19.0522, lon: 72.9005 };

export function household(over: Partial<Household> = {}): Household {
  return {
    place: MUMBAI_PLACE,
    members: [
      {
        id: 'aai',
        name: 'Aai',
        group: 'elder',
        sensitive: true,
        routines: [
          {
            id: 'walk',
            label: 'Evening walk',
            activity: 'moderate',
            minutes: 45,
            usualHour: 18,
            earliestHour: 14,
            latestHour: 22,
            required: false,
            mode: 'walk',
          },
        ],
      },
    ],
    ...over,
  };
}

export function planFacts(over: Partial<PlanFacts> = {}): PlanFacts {
  return {
    place: 'Chembur, Mumbai',
    source: 'cpcb',
    station: 'Borivali East, Mumbai - MPCB',
    updated: '2026-11-24T09:00:00+05:30',
    aqi: 162,
    category: 'Moderate',
    pm25: 78,
    forecast: Array.from({ length: 24 }, (_, hour) => ({ hour, pm25: 30 + hour })),
    items: [
      {
        member: 'Aai',
        group: 'elder',
        sensitive: true,
        label: 'Evening walk',
        verdict: 'shorten',
        usualHour: 18,
        bestHour: 14,
        usualAqi: 150,
        bestAqi: 110,
        savedDose: 120.5,
      },
    ],
    ...over,
  };
}
