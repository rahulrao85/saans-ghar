import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ generateContent: vi.fn(), ctor: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: h.generateContent };
    constructor(options: unknown) {
      h.ctor(options);
    }
  },
}));

import { geminiModel, withRetry } from '../../server/ai/model';

interface Call {
  model: string;
  contents: unknown;
  config: Record<string, unknown>;
}

function lastCall(): Call {
  const call = h.generateContent.mock.calls.at(-1) as [Call] | undefined;
  if (call === undefined) throw new Error('not called');
  return call[0];
}

const contents = [{ role: 'user', parts: [{ text: 'hi' }] }];

beforeEach(() => {
  h.generateContent.mockReset();
  h.ctor.mockReset();
});

describe('geminiModel', () => {
  it('builds the client with the key', () => {
    geminiModel('key-1', 'gemini-x');
    expect(h.ctor).toHaveBeenCalledWith({ apiKey: 'key-1' });
  });

  it('joins text parts, skips thoughts and maps tool calls', async () => {
    const content = {
      role: 'model',
      parts: [
        { text: 'secret', thought: true },
        { text: 'Hello ' },
        { inlineData: {} },
        { text: 'world' },
      ],
    };
    h.generateContent.mockResolvedValue({
      candidates: [{ content }],
      functionCalls: [{ name: 'air_now', args: { a: 1 } }, {}],
    });
    const out = await geminiModel('k', 'gemini-x').generate({
      system: 'sys',
      contents,
      tools: [{ name: 'air_now' }],
    });
    expect(out).toEqual({
      text: 'Hello world',
      calls: [
        { name: 'air_now', args: { a: 1 } },
        { name: '', args: {} },
      ],
      content,
    });
    const call = lastCall();
    expect(call.model).toBe('gemini-x');
    expect(call.contents).toBe(contents);
    expect(call.config).toMatchObject({
      systemInstruction: 'sys',
      temperature: 0.3,
      maxOutputTokens: 2048,
      tools: [{ functionDeclarations: [{ name: 'air_now' }] }],
    });
    expect(call.config).not.toHaveProperty('responseMimeType');
  });

  it('sends a JSON schema when asked and tolerates a bare response', async () => {
    h.generateContent.mockResolvedValue({});
    const schema = { type: 'object' };
    const out = await geminiModel('k', 'm').generate({ system: 's', contents, jsonSchema: schema });
    expect(out).toEqual({ text: '', calls: [], content: undefined });
    const { config } = lastCall();
    expect(config).toMatchObject({
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    });
    expect(config).not.toHaveProperty('tools');
  });

  it('handles a candidate without parts and an empty candidate list', async () => {
    h.generateContent.mockResolvedValueOnce({ candidates: [{ content: { role: 'model' } }] });
    const a = await geminiModel('k', 'm').generate({ system: 's', contents });
    expect(a.text).toBe('');
    h.generateContent.mockResolvedValueOnce({ candidates: [] });
    const b = await geminiModel('k', 'm').generate({ system: 's', contents });
    expect(b).toEqual({ text: '', calls: [], content: undefined });
  });

  it('retries a failed call and gives each try its own timeout signal', async () => {
    h.generateContent.mockRejectedValueOnce(new Error('503 high demand'));
    h.generateContent.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    });
    const out = await geminiModel('k', 'm').generate({ system: 's', contents });
    expect(out.text).toBe('ok');
    expect(h.generateContent).toHaveBeenCalledTimes(2);
    expect(lastCall().config.abortSignal).toBeInstanceOf(AbortSignal);
  });
});

describe('withRetry', () => {
  it('gives up after three tries and rethrows the last error', async () => {
    const call = vi.fn().mockRejectedValue(new Error('down'));
    await expect(withRetry(call)).rejects.toThrow('down');
    expect(call).toHaveBeenCalledTimes(3);
  });
});
