import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Content } from '@google/genai';
import type { AiModel, GenerateRequest, GenerateResult, ToolCall } from '../../server/ai/model';
import { askPlan, explainPlan, readDisplay, writeNotice } from '../../server/ai/tasks';
import { log } from '../../server/log';
import { noticeFacts } from '../../src/engine/notice';
import { FACTS } from '../fixtures/facts';

vi.mock('../../server/log', () => ({ log: vi.fn() }));

interface Fake {
  model: AiModel;
  requests: GenerateRequest[];
  lengths: number[];
}

/** A model that returns the given replies in order (the last repeats), or rejects. */
function fake(replies: readonly (GenerateResult | Error)[]): Fake {
  const requests: GenerateRequest[] = [];
  const lengths: number[] = [];
  let i = 0;
  const model: AiModel = {
    generate: (request) => {
      requests.push(request);
      lengths.push(request.contents.length);
      const reply = replies[Math.min(i++, replies.length - 1)];
      if (reply === undefined) return Promise.reject(new Error('no reply'));
      return reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply);
    },
  };
  return { model, requests, lengths };
}

const text = (t: string): GenerateResult => ({ text: t, calls: [], content: undefined });
const calling = (calls: ToolCall[], content?: Content): GenerateResult => ({
  text: '',
  calls,
  content,
});

beforeEach(() => {
  vi.mocked(log).mockClear();
});

describe('explainPlan', () => {
  it('uses the model reply when its numbers are grounded', async () => {
    const f = fake([text('  AQI 162 now. Walk at 2 pm instead of 6 pm; saves 41.5 µg.  ')]);
    const out = await explainPlan(f.model, FACTS, 'en');
    expect(out).toEqual({
      text: 'AQI 162 now. Walk at 2 pm instead of 6 pm; saves 41.5 µg.',
      source: 'gemini',
    });
    expect(f.requests[0]?.contents[0]?.parts?.[0]?.text).toContain('usualTime');
  });

  it('falls back to rules when the reply invents a number', async () => {
    const out = await explainPlan(fake([text('AQI 999 now')]).model, FACTS, 'hi');
    expect(out.source).toBe('rules');
    expect(out.text).toContain('AQI 162');
    expect(log).toHaveBeenCalledWith('warn', 'ai reply dropped by number guard');
  });

  it('falls back to rules on an empty reply without a warning', async () => {
    const out = await explainPlan(fake([text('   ')]).model, FACTS, 'mr');
    expect(out.source).toBe('rules');
    expect(log).not.toHaveBeenCalled();
  });

  it('falls back to rules when the model throws an Error', async () => {
    const out = await explainPlan(fake([new Error('quota')]).model, FACTS, 'en');
    expect(out.source).toBe('rules');
    expect(log).toHaveBeenCalledWith('warn', 'ai call failed', { message: 'quota' });
  });

  it('falls back to rules when the model throws a non-Error', async () => {
    const odd: AiModel = {
      generate: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'boom';
      },
    };
    expect((await explainPlan(odd, FACTS, 'en')).source).toBe('rules');
    expect(log).toHaveBeenLastCalledWith('warn', 'ai call failed', { message: 'unknown' });
  });

  it('uses rules when there is no model', async () => {
    const out = await explainPlan(null, FACTS, 'en');
    expect(out.source).toBe('rules');
    expect(out.text).toContain('Evening walk');
  });
});

describe('writeNotice', () => {
  const nf = noticeFacts('Chembur', 162, false, 14);

  it('accepts a grounded notice', async () => {
    const f = fake([text('AQI 162 in Chembur. Best hour 2 pm.')]);
    expect((await writeNotice(f.model, nf, 'en')).source).toBe('gemini');
  });

  it('falls back on an invented number or no model', async () => {
    expect((await writeNotice(fake([text('AQI 300')]).model, nf, 'en')).source).toBe('rules');
    const none = await writeNotice(null, nf, 'en');
    expect(none.source).toBe('rules');
    expect(none.text).toContain('Chembur');
  });
});

describe('askPlan', () => {
  it('answers directly when the model calls no tools', async () => {
    const out = await askPlan(fake([text('AQI is 162.')]).model, 'how is the air?', FACTS);
    expect(out).toEqual({ text: 'AQI is 162.', source: 'gemini' });
  });

  it('runs tool calls and then takes the text reply', async () => {
    const content: Content = { role: 'model', parts: [{ text: 'calling' }] };
    const f = fake([
      calling([{ name: 'air_now', args: {} }], content),
      text('Now AQI 162, PM2.5 78.4.'),
    ]);
    const out = await askPlan(f.model, 'air now?', FACTS);
    expect(out).toEqual({ text: 'Now AQI 162, PM2.5 78.4.', source: 'gemini' });
    // the question, then the question + model turn + tool results
    expect(f.lengths).toEqual([1, 3]);
    expect(f.requests[1]?.contents).toHaveLength(3);
    expect(f.requests[1]?.contents[2]?.parts?.[0]?.functionResponse?.name).toBe('air_now');
  });

  it('copes with a reply that has calls but no content', async () => {
    const f = fake([calling([{ name: 'nope', args: {} }]), text('I cannot tell.')]);
    const out = await askPlan(f.model, 'q', FACTS);
    expect(out.source).toBe('gemini');
    expect(f.requests[1]?.contents).toHaveLength(2);
  });

  it('gives up after four tool rounds', async () => {
    const f = fake([calling([{ name: 'air_now', args: {} }])]);
    const out = await askPlan(f.model, 'masks?', FACTS);
    expect(out.source).toBe('rules');
    expect(out.text).toContain('N95');
    expect(f.requests).toHaveLength(4);
  });

  it('falls back to rules when the model is null', async () => {
    expect((await askPlan(null, 'masks?', FACTS)).source).toBe('rules');
  });
});

describe('readDisplay', () => {
  const read = (json: string): Promise<unknown> =>
    readDisplay(fake([text(json)]).model, 'QUJD', 'image/png');

  it('passes the value through when a number was found', async () => {
    expect(await read('{"found":true,"pm25":55,"device":"monitor"}')).toEqual({
      found: true,
      pm25: 55,
      device: 'monitor',
    });
  });

  it('nulls the value when nothing was found', async () => {
    expect(await read('{"found":false,"pm25":40,"device":"other"}')).toEqual({
      found: false,
      pm25: null,
      device: 'other',
    });
  });

  it('sends the photo and a JSON schema', async () => {
    const f = fake([text('{"found":false,"pm25":null,"device":"purifier"}')]);
    await readDisplay(f.model, 'QUJD', 'image/jpeg');
    expect(f.requests[0]?.jsonSchema).toBeDefined();
    expect(f.requests[0]?.contents[0]?.parts?.[0]?.inlineData).toEqual({
      data: 'QUJD',
      mimeType: 'image/jpeg',
    });
  });

  it('throws on bad JSON or a shape mismatch', async () => {
    await expect(read('not json')).rejects.toThrow();
    await expect(read('{"found":true}')).rejects.toThrow();
  });
});
