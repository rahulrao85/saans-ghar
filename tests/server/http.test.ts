import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { clientIp, rateLimit, sameOrigin, securityHeaders } from '../../server/http';

describe('clientIp', () => {
  const app = new Hono().get('/', (c) => c.text(clientIp(c)));
  const ip = async (headers: Record<string, string>): Promise<string> =>
    (await app.request('/', { headers })).text();

  it('uses the first x-forwarded-for entry', async () => {
    expect(await ip({ 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8' })).toBe('1.2.3.4');
  });
  it('falls back to local without the header or with an empty one', async () => {
    expect(await ip({})).toBe('local');
    expect(await ip({ 'x-forwarded-for': '' })).toBe('local');
  });
});

describe('rateLimit', () => {
  it('blocks past the limit with Retry-After and resets after the window', async () => {
    const clock = { t: 0 };
    const app = new Hono()
      .use(
        '*',
        rateLimit(2, 10_000, () => clock.t),
      )
      .get('/', (c) => c.text('ok'));
    const get = (ip: string): Promise<Response> =>
      Promise.resolve(app.request('/', { headers: { 'x-forwarded-for': ip } }));
    expect((await get('a')).status).toBe(200);
    clock.t = 3000;
    expect((await get('a')).status).toBe(200);
    const blocked = await get('a');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('7');
    expect((await get('b')).status).toBe(200);
    clock.t = 10_000;
    expect((await get('a')).status).toBe(200);
  });

  it('uses Date.now by default', async () => {
    const app = new Hono().use('*', rateLimit(1, 60_000)).get('/', (c) => c.text('ok'));
    expect((await app.request('/')).status).toBe(200);
    expect((await app.request('/')).status).toBe(429);
  });
});

describe('sameOrigin', () => {
  const app = new Hono().use('*', sameOrigin).all('/', (c) => c.text('ok'));
  const send = (method: string, headers: Record<string, string>): Promise<Response> =>
    Promise.resolve(app.request('/', { method, headers }));

  it('lets reads through without an Origin', async () => {
    expect((await send('GET', {})).status).toBe(200);
    expect((await send('HEAD', {})).status).toBe(200);
  });
  it('blocks writes without Origin or Host, or with a mismatch', async () => {
    expect((await send('POST', { host: 'a.test' })).status).toBe(403);
    expect((await send('POST', { origin: 'https://a.test' })).status).toBe(403);
    expect((await send('POST', { origin: 'https://evil.test', host: 'a.test' })).status).toBe(403);
  });
  it('blocks a malformed or "null" Origin with 403, not 500', async () => {
    expect((await send('POST', { origin: 'null', host: 'a.test' })).status).toBe(403);
  });
  it('allows writes from the same origin', async () => {
    expect((await send('POST', { origin: 'https://a.test', host: 'a.test' })).status).toBe(200);
  });
});

describe('securityHeaders', () => {
  it('sets a strict CSP and HSTS', async () => {
    const app = new Hono().use('*', securityHeaders).get('/', (c) => c.text('ok'));
    const res = await app.request('/');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('strict-transport-security')).toContain('max-age=31536000');
  });
});
