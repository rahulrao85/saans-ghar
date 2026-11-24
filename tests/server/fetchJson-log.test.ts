import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJson } from '../../server/fetchJson';
import { log } from '../../server/log';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchJson', () => {
  it('GETs with a user agent and timeout and parses JSON', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json({ ok: 1 })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchJson('https://example.test/x')).toEqual({ ok: 1 });
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('https://example.test/x');
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
    expect(call[1].headers).toEqual({ 'user-agent': 'saans-ghar/0.1 (air-quality assistant)' });
  });

  it('throws on a non-2xx response', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('bad', { status: 502 })));
    await expect(fetchJson('https://example.test/x')).rejects.toThrow('Upstream 502');
  });
});

describe('log', () => {
  it('writes info and warn lines to stdout as JSON', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    log('info', 'hello', { a: 1 });
    log('warn', 'careful');
    expect(write).toHaveBeenNthCalledWith(1, '{"severity":"INFO","message":"hello","a":1}\n');
    expect(write).toHaveBeenNthCalledWith(2, '{"severity":"WARN","message":"careful"}\n');
  });

  it('writes errors to stderr', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    log('error', 'boom', { path: '/x' });
    expect(err).toHaveBeenCalledWith('{"severity":"ERROR","message":"boom","path":"/x"}');
  });
});
