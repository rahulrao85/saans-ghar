import { describe, expect, it, vi } from 'vitest';
import type { AiModel, GenerateResult } from '../../server/ai/model';
import { AirService } from '../../server/air';
import { createApp } from '../../server/app';
import { FACTS } from '../fixtures/facts';
import { airBody, fakeFetch, page, row, weatherBody } from './fixtures';

vi.mock('../../server/log', () => ({ log: vi.fn() }));

const NOW = Date.UTC(2026, 10, 24, 5, 30);

function modelReplying(...replies: (GenerateResult | Error)[]): AiModel {
  let i = 0;
  return {
    generate: () => {
      const reply = replies[Math.min(i++, replies.length - 1)];
      if (reply === undefined) return Promise.reject(new Error('none'));
      return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
    },
  };
}

const say = (text: string): GenerateResult => ({ text, calls: [], content: undefined });

function build(ai: AiModel | null): ReturnType<typeof createApp> {
  const { fetchJson } = fakeFetch({
    cpcb: () => page([row()]),
    air: () => airBody(),
    weather: () => weatherBody(),
  });
  const air = new AirService({ fetchJson, dataGovKey: 'k', now: () => NOW });
  return createApp({ air, fetchJson, ai });
}

let nextIp = 0;

/** POST with same-origin headers and a fresh client address (each test has its own rate limit). */
function post(
  app: ReturnType<typeof createApp>,
  path: string,
  body: unknown,
  ip = `10.0.0.${String(++nextIp)}`,
): Promise<Response> | Response {
  return app.request(path, {
    method: 'POST',
    headers: {
      origin: 'http://localhost',
      host: 'localhost',
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

interface AiBody {
  text: string;
  source: string;
  facts?: { call: string };
  error?: string;
  found?: boolean;
  pm25?: number | null;
}

const json = async (res: Response | Promise<Response>): Promise<AiBody> =>
  (await res).json() as Promise<AiBody>;

const NOTICE = {
  place: 'Chembur',
  aqi: 162,
  delhiNcr: false,
  cleanestHour: 14,
  language: 'en',
};

describe('AI routes without a model', () => {
  const app = build(null);

  it('explain answers from the rules', async () => {
    const res = await post(app, '/api/ai/explain', { facts: FACTS, language: 'en' });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ source: 'rules' });
  });

  it('ask answers from the rules', async () => {
    const res = await post(app, '/api/ai/ask', { facts: FACTS, question: ' masks? ' });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ source: 'rules' });
  });

  it('notice answers from the rules and returns the facts', async () => {
    const res = await post(app, '/api/ai/notice', NOTICE);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.source).toBe('rules');
    expect(body.facts?.call).toBe('reduce');
  });

  it('read is unavailable', async () => {
    const res = await post(app, '/api/ai/read', { image: 'QUJD', mimeType: 'image/png' });
    expect(res.status).toBe(503);
  });
});

describe('AI routes with a model', () => {
  it('explain, ask and notice return the model text when grounded', async () => {
    const app = build(modelReplying(say('AQI 162 now.')));
    const e = await json(post(app, '/api/ai/explain', { facts: FACTS, language: 'hi' }));
    expect(e).toEqual({ text: 'AQI 162 now.', source: 'gemini' });
    const a = await json(post(app, '/api/ai/ask', { facts: FACTS, question: 'air?' }));
    expect(a.source).toBe('gemini');
    const n = await json(post(app, '/api/ai/notice', NOTICE));
    expect(n.source).toBe('gemini');
    expect(n.facts?.call).toBe('reduce');
  });

  it('read returns the reading', async () => {
    const reply = say('{"found":true,"pm25":55,"device":"monitor"}');
    const res = await post(build(modelReplying(reply)), '/api/ai/read', {
      image: 'QUJD',
      mimeType: 'image/jpeg',
    });
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ found: true, pm25: 55, device: 'monitor' });
  });

  it('read answers 502 when the model throws or replies badly', async () => {
    const body = { image: 'QUJD', mimeType: 'image/webp' };
    const thrown = await post(build(modelReplying(new Error('down'))), '/api/ai/read', body);
    expect(thrown.status).toBe(502);
    const bad = await post(build(modelReplying(say('nope'))), '/api/ai/read', body);
    expect(bad.status).toBe(502);
  });

  it('read answers 502 when something other than an Error is thrown', async () => {
    const odd: AiModel = {
      generate: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'boom';
      },
    };
    const res = await post(build(odd), '/api/ai/read', { image: 'QUJD', mimeType: 'image/png' });
    expect(res.status).toBe(502);
  });

  it('read answers 400 for a bad body', async () => {
    const app = build(modelReplying(say('')));
    expect((await post(app, '/api/ai/read', { image: '***', mimeType: 'image/png' })).status).toBe(
      400,
    );
    expect((await post(app, '/api/ai/read', 'not json')).status).toBe(400);
  });
});

describe('AI route validation', () => {
  const app = build(null);

  it('answers 400 for bad bodies', async () => {
    expect((await post(app, '/api/ai/explain', { facts: FACTS, language: 'fr' })).status).toBe(400);
    expect((await post(app, '/api/ai/ask', { facts: FACTS, question: '   ' })).status).toBe(400);
    expect((await post(app, '/api/ai/notice', { ...NOTICE, aqi: 900 })).status).toBe(400);
  });

  it('answers 400 for text that is not JSON', async () => {
    for (const path of ['/api/ai/explain', '/api/ai/ask', '/api/ai/notice']) {
      const res = await post(app, path, 'not json');
      expect(res.status).toBe(400);
      expect((await json(res)).error).toContain('did not look right');
    }
  });

  it('answers 413 for a body over 32 KB', async () => {
    const res = await post(app, '/api/ai/explain', {
      facts: FACTS,
      language: 'en',
      pad: 'x'.repeat(33_000),
    });
    expect(res.status).toBe(413);
    expect((await json(res)).error).toBe('Request too large.');
  });

  it('rate limits AI calls to 12 a minute per client', async () => {
    const ip = '172.16.0.1';
    for (let i = 0; i < 12; i++) {
      expect((await post(app, '/api/ai/explain', {}, ip)).status).toBe(400);
    }
    const blocked = await post(app, '/api/ai/explain', {}, ip);
    expect(blocked.status).toBe(429);
    expect((await post(app, '/api/ai/explain', {}, '172.16.0.2')).status).toBe(400);
  });
});
